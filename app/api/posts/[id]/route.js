import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/lib/db/mongodb";
import { ObjectId } from "mongodb";

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
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id } = params;

    // Find the post to make sure it belongs to the user
    const post = await db.collection("posts").findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Remove the job from BullMQ queue
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
      }
    } catch (error) {
      console.error("Error removing job from queue:", error);
    }

    // Delete the post from database
    await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
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
    const { id } = params;
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
    const { id } = params;

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
