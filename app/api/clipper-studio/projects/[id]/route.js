import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import VideoProject from "@/app/models/VideoProject";
import { deleteFile } from "@/app/lib/storage/firebase";

/**
 * GET endpoint to fetch a specific video project
 */
export async function GET(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    console.log(`📋 [PROJECT] Fetching project: ${id}`);
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    // Find the project
    const project = await VideoProject.findOne({
      _id: id,
      userId: session.user.id
    }).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log(`✅ [PROJECT] Found project: ${project.originalVideo?.filename || project.sourceUrl}`);

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    console.error("========== Video Project Fetch Failed ==========");
    console.error(`❌ [PROJECT] Fetch failed for ${params.id}:`, error);
    return NextResponse.json({
      error: "Failed to fetch video project"
    }, { status: 500 });
  }
}

/**
 * PUT endpoint to update a video project
 */
export async function PUT(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    console.log(`🔄 [PROJECT] Updating project: ${id}`);
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    const body = await request.json();
    const {
      status,
      transcription,
      errorMessage,
      saveProject,
      analytics
    } = body;

    // Find the project first to ensure it belongs to the user
    const project = await VideoProject.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update fields
    const updates = {};
    
    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      updates.status = status;
      
      if (status === 'completed' || status === 'failed') {
        updates.processingCompleted = new Date();
      }
    }

    if (transcription) {
      updates.transcription = transcription;
    }

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (analytics) {
      if (analytics.totalClipsGenerated !== undefined) {
        updates['analytics.totalClipsGenerated'] = analytics.totalClipsGenerated;
      }
      if (analytics.totalDownloads !== undefined) {
        updates['analytics.totalDownloads'] = analytics.totalDownloads;
      }
      updates['analytics.lastAccessed'] = new Date();
    }

    // Handle save project action
    if (saveProject === true) {
      updates['saveStatus.isSaved'] = true;
      updates['saveStatus.savedAt'] = new Date();
      updates['saveStatus.autoDeleteAt'] = null; // Remove auto-delete
    }

    // Update the project
    const updatedProject = await VideoProject.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );

    console.log(`✅ [PROJECT] Updated project: ${id}`);

    return NextResponse.json({
      success: true,
      project: updatedProject
    });

  } catch (error) {
    console.error("========== Video Project Update Failed ==========");
    console.error(`❌ [PROJECT] Update failed for ${params.id}:`, error);
    return NextResponse.json({
      error: "Failed to update video project"
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to delete a video project
 */
export async function DELETE(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    console.log(`🗑️ [PROJECT] Deleting project: ${id}`);
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    // First find the project to get file paths before deletion
    const project = await VideoProject.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Collect Firebase file paths to delete
    const filesToDelete = [];
    
    // Add thumbnail URL if it exists and is a Firebase URL
    const thumbnailUrl = project.originalVideo?.thumbnailUrl;
    if (thumbnailUrl && thumbnailUrl.includes('firebasestorage.googleapis.com')) {
      const thumbnailPath = extractFirebasePathFromUrl(thumbnailUrl);
      if (thumbnailPath) {
        filesToDelete.push(thumbnailPath);
      }
    }

    // Add original video file if uploaded and stored in Firebase
    const videoUrl = project.originalVideo?.url;
    if (videoUrl && videoUrl.includes('firebasestorage.googleapis.com')) {
      const videoPath = extractFirebasePathFromUrl(videoUrl);
      if (videoPath) {
        filesToDelete.push(videoPath);
      }
    }

    // Delete files from Firebase Storage
    if (filesToDelete.length > 0) {
      console.log(`🧹 [CLEANUP] Deleting ${filesToDelete.length} files from Firebase...`);
      
      const deletePromises = filesToDelete.map(async (path) => {
        try {
          await deleteFile(path);
          console.log(`✅ [CLEANUP] Deleted file: ${path}`);
        } catch (fileError) {
          console.warn(`⚠️ [CLEANUP] Failed to delete file ${path}:`, fileError.message);
          // Continue with other deletions even if one fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Now delete the project from database
    await VideoProject.findByIdAndDelete(id);

    console.log(`✅ [PROJECT] Deleted project and associated files: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Project and associated files deleted successfully"
    });

  } catch (error) {
    console.error("========== Video Project Deletion Failed ==========");
    console.error(`❌ [PROJECT] Deletion failed for ${params.id}:`, error);
    return NextResponse.json({
      error: "Failed to delete video project"
    }, { status: 500 });
  }
}

/**
 * Helper function to extract Firebase Storage path from a Firebase URL
 * @param {string} url - Firebase Storage URL
 * @returns {string|null} - Extracted path or null if invalid
 */
function extractFirebasePathFromUrl(url) {
  try {
    // Firebase Storage URLs follow this pattern:
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('firebasestorage.googleapis.com')) {
      return null;
    }

    // Extract the path from the 'o' parameter
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (pathMatch) {
      // Decode the URL-encoded path
      return decodeURIComponent(pathMatch[1]);
    }

    return null;
  } catch (error) {
    console.warn("Failed to extract Firebase path from URL:", url, error);
    return null;
  }
}