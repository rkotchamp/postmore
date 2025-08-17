import { NextResponse } from 'next/server';
import { detectVideoClips, healthCheck } from '@/app/lib/video-processing/services/visionClipService';
import { downloadVideoWithMetadata } from '@/app/lib/video-processing/services/videoDownloadService';
import VideoProject from '@/app/models/VideoProject';
import VideoClip from '@/app/models/VideoClip';
import connectToMongoose from '@/app/lib/db/mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  console.log('🎬 [CLIP-API] Starting clip detection request...');
  
  try {
    // Get user session for database operations
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [CLIP-API] Unauthorized - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    
    const { url, projectId, options = {} } = await request.json();
    
    if (!url) {
      console.error('❌ [CLIP-API] No URL provided');
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    console.log(`📹 [CLIP-API] Processing video: ${url}`);
    console.log(`⚙️ [CLIP-API] Options:`, options);
    
    // Step 1: Health check Vision API
    console.log(`🏥 [CLIP-API] Checking Vision API health...`);
    const health = await healthCheck();
    
    if (!health.healthy) {
      console.error(`❌ [CLIP-API] Vision API is not healthy:`, health);
      return NextResponse.json({
        success: false,
        error: 'Vision API is not available',
        details: health
      }, { status: 503 });
    }
    
    console.log(`✅ [CLIP-API] Vision API is healthy`);
    
    // Step 2: Download video
    console.log(`⬇️ [CLIP-API] Downloading video...`);
    const downloadResult = await downloadVideoWithMetadata(url, {
      quality: 'best[height<=720]', // Lower quality for faster processing
      outputPath: '/tmp'
    });
    
    console.log(`✅ [CLIP-API] Video downloaded: ${downloadResult.filePath}`);
    console.log(`📊 [CLIP-API] Video metadata:`, {
      title: downloadResult.metadata.title,
      duration: downloadResult.metadata.duration,
      platform: downloadResult.metadata.platform
    });
    
    // Step 3: Detect clips using Vision model
    console.log(`🤖 [CLIP-API] Starting vision-based clip detection...`);
    const clipResult = await detectVideoClips(downloadResult.filePath, {
      numFrames: options.numFrames || 8, // Fewer frames for faster processing
      minEngagementScore: options.minEngagementScore || 25, // Lower threshold
      clipDuration: options.clipDuration || 30,
      maxClips: options.maxClips || 5
    });
    
    console.log(`🎉 [CLIP-API] Clip detection completed successfully`);
    console.log(`📊 [CLIP-API] Found ${clipResult.clips.length} clips`);
    
    // Step 4: Store clips in database
    let savedClips = [];
    if (projectId && clipResult.clips.length > 0) {
      console.log(`💾 [CLIP-API] Storing ${clipResult.clips.length} clips in database...`);
      
      try {
        // Verify project exists and belongs to user
        const project = await VideoProject.findOne({ 
          _id: projectId, 
          userId: session.user.id 
        });
        
        if (!project) {
          console.error(`❌ [CLIP-API] Project ${projectId} not found or unauthorized`);
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        
        // Create VideoClip records
        const clipData = clipResult.clips.map(clip => ({
          projectId: projectId,
          userId: session.user.id,
          title: `${downloadResult.metadata.title} - Clip ${clip.id}`,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
          viralityScore: Math.round(clip.engagementScore),
          status: 'ready'
        }));
        
        savedClips = await VideoClip.insertMany(clipData);
        console.log(`✅ [CLIP-API] Successfully saved ${savedClips.length} clips to database`);
        
        // Update project status and analytics
        await VideoProject.findByIdAndUpdate(projectId, {
          $set: {
            status: 'completed',
            processingCompleted: new Date(),
            'analytics.totalClipsGenerated': savedClips.length
          }
        });
        
        console.log(`✅ [CLIP-API] Updated project ${projectId} status to completed`);
        
      } catch (dbError) {
        console.error(`❌ [CLIP-API] Database error:`, dbError);
        // Continue with response even if database save fails
        savedClips = [];
      }
    } else {
      console.log(`⚠️ [CLIP-API] No projectId provided or no clips found - skipping database storage`);
    }
    
    // Step 5: Cleanup downloaded video
    try {
      const fs = require('fs');
      if (fs.existsSync(downloadResult.filePath)) {
        fs.unlinkSync(downloadResult.filePath);
        console.log(`🧹 [CLIP-API] Cleaned up downloaded video file`);
      }
    } catch (cleanupError) {
      console.warn(`⚠️ [CLIP-API] Failed to cleanup video file:`, cleanupError.message);
    }
    
    // Step 5: Return results
    const response = {
      success: true,
      url,
      video: {
        title: downloadResult.metadata.title,
        duration: downloadResult.metadata.duration,
        platform: downloadResult.metadata.platform,
        uploader: downloadResult.metadata.uploader
      },
      analysis: {
        totalFramesExtracted: clipResult.totalFramesExtracted,
        totalFramesAnalyzed: clipResult.totalFramesAnalyzed,
        averageEngagementScore: clipResult.averageEngagementScore
      },
      clips: clipResult.clips.map(clip => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        engagementScore: clip.engagementScore,
        description: clip.description,
        reason: clip.reason
      })),
      processingTime: Date.now() - clipResult.processingTime
    };
    
    console.log(`✅ [CLIP-API] Returning successful response with ${response.clips.length} clips`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [CLIP-API] Clip detection failed:', error.message);
    console.error('📚 [CLIP-API] Full error:', error);
    
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

export async function GET(request) {
  try {
    console.log(`🏥 [CLIP-API] Health check request`);
    
    const health = await healthCheck();
    
    return NextResponse.json({
      service: 'SmolVLM2 Clip Detection',
      healthy: health.healthy,
      details: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CLIP-API] Health check failed:', error);
    
    return NextResponse.json({
      service: 'SmolVLM2 Clip Detection',
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}