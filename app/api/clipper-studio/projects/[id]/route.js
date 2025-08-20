import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import VideoProject from "@/app/models/VideoProject";
import VideoClip from "@/app/models/VideoClip";
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
 * PATCH endpoint to update specific project fields (used for status updates)
 */
export async function PATCH(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    console.log(`🔄 [PROJECT-PATCH] Updating project: ${id}`);
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    const updates = await request.json();
    
    // Find the project first to ensure it belongs to the user
    const project = await VideoProject.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update the project with provided fields
    const updatedProject = await VideoProject.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );

    console.log(`✅ [PROJECT-PATCH] Updated project ${id}:`, updates);

    return NextResponse.json({
      success: true,
      project: updatedProject
    });

  } catch (error) {
    console.error("========== Video Project Patch Failed ==========");
    console.error(`❌ [PROJECT-PATCH] Update failed for ${params.id}:`, error);
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

    // Step 1: Find and collect all related clips
    const clips = await VideoClip.find({
      projectId: id,
      userId: session.user.id
    });

    console.log(`📋 [CLEANUP] Found ${clips.length} clips to delete for project ${id}`);

    // Collect Firebase file paths to delete
    const filesToDelete = [];
    
    // Add project thumbnail URL if it exists and is a Firebase URL
    const thumbnailUrl = project.originalVideo?.thumbnailUrl;
    if (thumbnailUrl && thumbnailUrl.includes('firebasestorage.googleapis.com')) {
      const thumbnailPath = extractFirebasePathFromUrl(thumbnailUrl);
      if (thumbnailPath) {
        filesToDelete.push({ path: thumbnailPath, type: 'project-thumbnail' });
      }
    }

    // Add original video file if uploaded and stored in Firebase
    const videoUrl = project.originalVideo?.url;
    if (videoUrl && videoUrl.includes('firebasestorage.googleapis.com')) {
      const videoPath = extractFirebasePathFromUrl(videoUrl);
      if (videoPath) {
        filesToDelete.push({ path: videoPath, type: 'project-video' });
      }
    }

    // Add all clip video files from Firebase
    clips.forEach((clip, index) => {
      const clipVideoUrl = clip.generatedVideo?.url;
      if (clipVideoUrl && clipVideoUrl.includes('firebasestorage.googleapis.com')) {
        const clipPath = extractFirebasePathFromUrl(clipVideoUrl);
        if (clipPath) {
          filesToDelete.push({ 
            path: clipPath, 
            type: 'clip-video',
            clipId: clip._id,
            title: clip.title 
          });
        }
      }
    });

    // Step 2: Delete files from Firebase Storage
    if (filesToDelete.length > 0) {
      console.log(`🧹 [CLEANUP] Deleting ${filesToDelete.length} files from Firebase...`);
      
      const deletePromises = filesToDelete.map(async (fileInfo) => {
        try {
          await deleteFile(fileInfo.path);
          console.log(`✅ [CLEANUP] Deleted ${fileInfo.type}: ${fileInfo.path}`);
        } catch (fileError) {
          console.warn(`⚠️ [CLEANUP] Failed to delete ${fileInfo.type} ${fileInfo.path}:`, fileError.message);
          // Continue with other deletions even if one fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Step 3: Delete all clips from database
    if (clips.length > 0) {
      const deletedClips = await VideoClip.deleteMany({
        projectId: id,
        userId: session.user.id
      });
      console.log(`🗑️ [DATABASE] Deleted ${deletedClips.deletedCount} clips from database`);
    }

    // Step 4: Delete the project from database
    await VideoProject.findByIdAndDelete(id);

    console.log(`✅ [PROJECT] Complete deletion finished for project: ${id}`);
    console.log(`🎯 [SUMMARY] Deleted: 1 project, ${clips.length} clips, ${filesToDelete.length} Firebase files`);

    return NextResponse.json({
      success: true,
      message: "Project, clips, and all associated files deleted successfully",
      deletionSummary: {
        project: 1,
        clips: clips.length,
        firebaseFiles: filesToDelete.length
      }
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