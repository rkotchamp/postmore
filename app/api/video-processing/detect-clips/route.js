import { NextResponse } from 'next/server';
import { detectVideoClips, healthCheck } from '@/app/lib/video-processing/services/visionClipService';
import { downloadVideoWithMetadata } from '@/app/lib/video-processing/services/videoDownloadService';

export async function POST(request) {
  console.log('🎬 [CLIP-API] Starting clip detection request...');
  
  try {
    const { url, options = {} } = await request.json();
    
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
    
    // Step 4: Cleanup downloaded video
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