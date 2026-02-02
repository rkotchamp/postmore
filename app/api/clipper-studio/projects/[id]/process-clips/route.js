import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VideoClip from '@/app/models/VideoClip';
import VideoProject from '@/app/models/VideoProject';
import connectToMongoose from '@/app/lib/db/mongoose';
import { downloadVideoWithMetadata } from '@/app/lib/video-processing/services/videoDownloadService';
import { processClipsFromMetadata } from '@/app/lib/video-processing/services/clipCuttingService';

/**
 * POST /api/clipper-studio/projects/[id]/process-clips
 * Process existing clip metadata to create actual video files with Whisper titles
 */
export async function POST(request, { params }) {
  const { id: projectId } = await params;
  console.log('🎬 [PROCESS-CLIPS-API] Starting clip processing for project:', projectId);
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [PROCESS-CLIPS-API] Unauthorized - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    
    // Verify project exists and belongs to user
    const project = await VideoProject.findOne({ 
      _id: projectId, 
      userId: session.user.id 
    });
    
    if (!project) {
      console.error(`❌ [PROCESS-CLIPS-API] Project ${projectId} not found or unauthorized`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    console.log(`📊 [PROCESS-CLIPS-API] Project found: ${project.sourceUrl}`);
    console.log(`📊 [PROCESS-CLIPS-API] Project status: ${project.status}`);
    
    // Get all clips for this project
    const clips = await VideoClip.find({ 
      projectId: projectId,
      userId: session.user.id 
    }).sort({ startTime: 1 });
    
    if (!clips.length) {
      console.error(`❌ [PROCESS-CLIPS-API] No clips found for project ${projectId}`);
      return NextResponse.json({ error: 'No clips found for this project' }, { status: 404 });
    }
    
    console.log(`📋 [PROCESS-CLIPS-API] Found ${clips.length} clips to process`);
    clips.forEach((clip, i) => {
      console.log(`   Clip ${i + 1}: ${clip.startTime}s-${clip.endTime}s (${clip.viralityScore}/100)`);
    });
    
    // Download the original video again for cutting
    console.log(`⬇️ [PROCESS-CLIPS-API] Downloading original video...`);
    const downloadResult = await downloadVideoWithMetadata(project.sourceUrl, {
      quality: 'best[height<=720]',
      outputPath: '/tmp'
    });
    
    console.log(`✅ [PROCESS-CLIPS-API] Video downloaded: ${downloadResult.filePath}`);
    
    // Process clips: cut videos, extract audio, generate titles, upload to Firebase
    console.log(`🎬 [PROCESS-CLIPS-API] Starting clip processing...`);
    const processedClips = await processClipsFromMetadata(
      downloadResult.filePath,
      clips,
      projectId,
      project.originalVideo?.filename || project.metadata?.title || 'Video'
    );
    
    // Update clip records in database with generated video URLs and titles
    console.log(`💾 [PROCESS-CLIPS-API] Updating clips in database...`);
    const updatePromises = processedClips.map(async (processedClip) => {
      if (processedClip.error) {
        console.log(`⚠️ [PROCESS-CLIPS-API] Skipping failed clip: ${processedClip.clipId}`);
        return null;
      }
      
      try {
        const updatedClip = await VideoClip.findByIdAndUpdate(
          processedClip.clipId,
          {
            $set: {
              title: processedClip.title,
              generatedVideo: processedClip.generatedVideo,
              status: 'ready'
            }
          },
          { new: true }
        );
        
        console.log(`✅ [PROCESS-CLIPS-API] Updated clip ${processedClip.clipId}: "${processedClip.title}"`);
        return updatedClip;
      } catch (updateError) {
        console.error(`❌ [PROCESS-CLIPS-API] Failed to update clip ${processedClip.clipId}:`, updateError);
        return null;
      }
    });
    
    const updatedClips = await Promise.all(updatePromises);
    const successfulUpdates = updatedClips.filter(clip => clip !== null);
    
    // Update project analytics
    console.log(`📊 [PROCESS-CLIPS-API] Updating project analytics...`);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: {
        'analytics.totalClipsGenerated': successfulUpdates.length,
        'analytics.lastAccessed': new Date()
      }
    });
    
    // Cleanup downloaded video
    console.log(`🧹 [PROCESS-CLIPS-API] Cleaning up downloaded video...`);
    try {
      const fs = require('fs');
      if (fs.existsSync(downloadResult.filePath)) {
        fs.unlinkSync(downloadResult.filePath);
        console.log(`✅ [PROCESS-CLIPS-API] Cleaned up downloaded video`);
      }
    } catch (cleanupError) {
      console.warn(`⚠️ [PROCESS-CLIPS-API] Cleanup warning:`, cleanupError.message);
    }
    
    console.log(`🎉 [PROCESS-CLIPS-API] Clip processing completed!`);
    console.log(`✅ [PROCESS-CLIPS-API] Successfully processed: ${successfulUpdates.length}/${clips.length} clips`);
    
    return NextResponse.json({
      success: true,
      projectId: projectId,
      totalClips: clips.length,
      processedClips: successfulUpdates.length,
      failedClips: clips.length - successfulUpdates.length,
      clips: successfulUpdates.map(clip => ({
        id: clip._id,
        title: clip.title,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        viralityScore: clip.viralityScore,
        videoUrl: clip.generatedVideo?.url,
        status: clip.status
      }))
    });
    
  } catch (error) {
    console.error('❌ [PROCESS-CLIPS-API] Clip processing failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}