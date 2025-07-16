import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { deleteMultipleFiles } from "@/app/lib/storage/firebase";
import { getFirestore, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase-config";
import { auth } from "@/app/lib/auth";

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
  console.log("DELETE route called with params:", params);

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    console.log("Session: not authenticated");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const postId = params.id;

  try {
    const db = getFirestore();
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postData = postSnap.data();

    // Check if the user owns the post
    if (postData.userId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete associated media from Firebase Storage if it exists
    if (
      postData.media &&
      Array.isArray(postData.media) &&
      postData.media.length > 0
    ) {
      const mediaPaths = postData.media
        .filter((mediaItem) => mediaItem && mediaItem.path)
        .map((mediaItem) => mediaItem.path);

      if (mediaPaths.length > 0) {
        try {
          await deleteMultipleFiles(mediaPaths);
          console.log("Successfully deleted media files");
        } catch (mediaError) {
          console.error("Error deleting media files:", mediaError);
          // Continue with deletion even if media deletion fails
        }
      }
    }

    // Delete the post document from Firestore
    await deleteDoc(postRef);

    return new Response(
      JSON.stringify({ message: "Post deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting post:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete post",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
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
