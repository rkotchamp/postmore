import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { deleteMultipleFiles } from "@/app/lib/storage/firebase";

// Helper function to extract storage path from Firebase URL
const extractStoragePathFromUrl = (url) => {
  if (!url) return null;

  try {
    // Firebase Storage URLs have the format:
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media&token={token}
    const urlObj = new URL(url);

    if (urlObj.hostname === "firebasestorage.googleapis.com") {
      // Extract the path part after '/o/'
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
      if (pathMatch) {
        // Decode the path
        return decodeURIComponent(pathMatch[1]);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting storage path from URL:", error);
    return null;
  }
};

// Helper function to check if post is editable (>10 minutes before scheduled time)
const isPostEditable = (scheduledTime) => {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const timeDiff = scheduled - now;
  return timeDiff > 10 * 60 * 1000; // 10 minutes in milliseconds
};

// Helper function to reschedule BullMQ job
const rescheduleJob = async (postId, newScheduledTime) => {
  try {
    // Import the queue management functions
    const { Queue } = await import("bullmq");

    // Connect to the post queue
    const postQueue = new Queue("post-queue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
    });

    // Remove the existing job if it exists
    const existingJobs = await postQueue.getJobs(["waiting", "delayed"]);
    const existingJob = existingJobs.find((job) => job.data.postId === postId);

    if (existingJob) {
      await existingJob.remove();
    }

    // Create a new job with the updated schedule
    const delay = new Date(newScheduledTime).getTime() - Date.now();

    if (delay > 0) {
      await postQueue.add(
        "publish-post",
        { postId },
        {
          delay,
          jobId: `post-${postId}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("Error rescheduling job:", error);
    return false;
  }
};

// DELETE - Delete a scheduled post
export async function DELETE(request, { params }) {
  const debugInfo = {
    step: "initialization",
    error: null,
    details: {},
  };

  try {
    debugInfo.step = "resolving_params";
    // Await params in Next.js 15
    const resolvedParams = await params;
    debugInfo.details.params = resolvedParams;

    debugInfo.step = "checking_session";
    const session = await getServerSession(authOptions);
    debugInfo.details.hasSession = !!session;
    debugInfo.details.hasUserId = !!session?.user?.id;

    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: debugInfo,
        },
        { status: 401 }
      );
    }

    debugInfo.step = "connecting_database";
    const { db } = await connectToDatabase();
    debugInfo.details.dbConnected = true;

    const { id } = resolvedParams;
    debugInfo.details.postId = id;

    // Find the post to make sure it belongs to the user
    debugInfo.step = "creating_object_id";
    let objectId;
    try {
      objectId = new ObjectId(id);
      debugInfo.details.objectIdCreated = true;
    } catch (objectIdError) {
      debugInfo.error = "Invalid post ID format";
      debugInfo.details.objectIdError = objectIdError.message;
      return NextResponse.json(
        {
          error: "Invalid post ID",
          debug: debugInfo,
        },
        { status: 400 }
      );
    }

    debugInfo.step = "finding_post";
    const post = await db.collection("posts").findOne({
      _id: objectId,
      userId: session.user.id,
    });

    debugInfo.details.postFound = !!post;
    debugInfo.details.postId = post?._id;

    if (!post) {
      return NextResponse.json(
        {
          error: "Post not found",
          debug: debugInfo,
        },
        { status: 404 }
      );
    }

    // Remove the job from BullMQ queue
    debugInfo.step = "removing_bullmq_job";
    try {
      const { Queue } = await import("bullmq");
      const postQueue = new Queue("post-queue", {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
        },
      });

      const jobs = await postQueue.getJobs(["waiting", "delayed"]);
      const job = jobs.find((j) => j.data.postId === id);
      if (job) {
        await job.remove();
        debugInfo.details.bullmqJobRemoved = true;
      } else {
        debugInfo.details.bullmqJobRemoved = false;
        debugInfo.details.bullmqJobNotFound = true;
      }
    } catch (bullmqError) {
      debugInfo.details.bullmqError = bullmqError.message;
      debugInfo.details.bullmqJobRemoved = false;
      // Continue with deletion even if BullMQ fails
    }

    // Delete associated media files from Firebase Storage
    debugInfo.step = "processing_media_files";
    const mediaFilesToDelete = [];

    // Extract media file paths from the post
    if (post.media && Array.isArray(post.media)) {
      debugInfo.details.mediaItemsCount = post.media.length;

      post.media.forEach((mediaItem, index) => {
        try {
          // Try to get the storage path directly, or extract it from the URL
          let storagePath = mediaItem.path;
          if (!storagePath && mediaItem.url) {
            storagePath = extractStoragePathFromUrl(mediaItem.url);
          }

          if (storagePath) {
            mediaFilesToDelete.push(storagePath);
          }

          // Also delete thumbnail if it exists (for videos)
          if (mediaItem.thumbnail) {
            const thumbnailPath = extractStoragePathFromUrl(
              mediaItem.thumbnail
            );
            if (thumbnailPath) {
              mediaFilesToDelete.push(thumbnailPath);
            }
          }
        } catch (mediaError) {
          debugInfo.details.mediaProcessingError = mediaError.message;
          debugInfo.details.failedMediaIndex = index;
        }
      });
    }

    debugInfo.details.mediaFilesToDeleteCount = mediaFilesToDelete.length;

    // Delete media files from Firebase Storage
    debugInfo.step = "deleting_firebase_media";
    if (mediaFilesToDelete.length > 0) {
      try {
        await deleteMultipleFiles(mediaFilesToDelete);
        debugInfo.details.firebaseMediaDeleted = true;
        debugInfo.details.firebaseFilesDeleted = mediaFilesToDelete.length;
      } catch (firebaseError) {
        debugInfo.details.firebaseError = firebaseError.message;
        debugInfo.details.firebaseMediaDeleted = false;
        // Continue with post deletion even if Firebase deletion fails
        // This prevents orphaned database records
      }
    } else {
      debugInfo.details.firebaseMediaDeleted = true;
      debugInfo.details.firebaseFilesDeleted = 0;
    }

    // Delete the post from database
    debugInfo.step = "deleting_from_database";
    const deleteResult = await db
      .collection("posts")
      .deleteOne({ _id: objectId });
    debugInfo.details.databaseDeleted = deleteResult.deletedCount === 1;
    debugInfo.details.deleteResult = deleteResult;

    debugInfo.step = "completed";
    return NextResponse.json({
      message: "Post deleted successfully",
      deletedMediaFiles: mediaFilesToDelete.length,
      debug: debugInfo,
    });
  } catch (error) {
    debugInfo.error = error.message;
    debugInfo.details.errorStack = error.stack;
    debugInfo.details.errorName = error.name;

    return NextResponse.json(
      {
        error: "Failed to delete post",
        details: error.message,
        debug: debugInfo,
      },
      { status: 500 }
    );
  }
}

// PUT - Update a scheduled post
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const updateData = await request.json();

    // Find the existing post
    const existingPost = await db.collection("posts").findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if post is still editable
    if (!isPostEditable(existingPost.scheduledDate)) {
      return NextResponse.json(
        { error: "Post cannot be edited - too close to scheduled time" },
        { status: 400 }
      );
    }

    // Validate the update data
    const { caption, selectedAccounts, scheduledDate } = updateData;

    // Prepare the update object
    const updateObject = {
      updatedAt: new Date(),
    };

    if (caption !== undefined) {
      updateObject.caption = caption;
    }

    if (selectedAccounts !== undefined) {
      updateObject.selectedAccounts = selectedAccounts;
    }

    if (scheduledDate !== undefined) {
      const newScheduledDate = new Date(scheduledDate);

      // Validate that the new scheduled date is at least 10 minutes in the future
      if (newScheduledDate.getTime() - Date.now() < 10 * 60 * 1000) {
        return NextResponse.json(
          { error: "Scheduled date must be at least 10 minutes in the future" },
          { status: 400 }
        );
      }

      updateObject.scheduledDate = newScheduledDate;

      // Reschedule the BullMQ job
      const rescheduled = await rescheduleJob(id, newScheduledDate);
      if (!rescheduled) {
        console.warn(
          "Failed to reschedule job, but proceeding with database update"
        );
      }
    }

    // Update the post in database
    const result = await db
      .collection("posts")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateObject });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Fetch and return the updated post
    const updatedPost = await db.collection("posts").findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// GET - Get a specific post
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const post = await db.collection("posts").findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
