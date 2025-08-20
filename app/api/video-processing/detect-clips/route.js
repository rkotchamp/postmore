import { NextResponse } from 'next/server';
import { transcribeWithWhisper } from '@/app/lib/video-processing/services/openaiWhisperService';
import { analyzeContentWithDeepSeek } from '@/app/lib/video-processing/services/deepseekAnalysisService';
import { downloadVideoWithMetadata } from '@/app/lib/video-processing/services/videoDownloadService';
import { processClipsFromMetadata } from '@/app/lib/video-processing/services/clipCuttingService';
import VideoProject from '@/app/models/VideoProject';
import VideoClip from '@/app/models/VideoClip';
import connectToMongoose from '@/app/lib/db/mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Process video asynchronously for large files
 */
// Global processing lock to prevent duplicate processing
const processingLocks = new Set();

async function processVideoAsync(url, projectId, options, userId) {
  console.log(`🎬 [ASYNC] Starting async processing for project ${projectId}...`);
  
  // Check if this project is already being processed
  if (processingLocks.has(projectId)) {
    console.warn(`⚠️ [ASYNC] Project ${projectId} is already being processed, skipping duplicate request`);
    return;
  }
  
  // Add lock
  processingLocks.add(projectId);
  
  try {
    await connectToMongoose();
    
    // Step 1: Download video
    console.log(`⬇️ [ASYNC] Downloading video for project ${projectId}...`);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: { 'analytics.processingStage': 'downloading' }
    });
    
    const downloadResult = await downloadVideoWithMetadata(url, {
      quality: 'best[height<=720]', // Keep original quality setting
      outputPath: '/tmp'
    });
    
    console.log(`✅ [ASYNC] Video downloaded for project ${projectId}: ${downloadResult.filePath}`);
    
    // Step 2: Transcribe with Whisper
    console.log(`🎤 [ASYNC] Starting transcription for project ${projectId}...`);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: { 'analytics.processingStage': 'transcribing' }
    });
    
    const transcriptionResult = await transcribeWithWhisper(downloadResult.filePath, {
      language: options.language || null,
      responseFormat: 'verbose_json',
      temperature: 0
    });
    
    console.log(`✅ [ASYNC] Transcription completed for project ${projectId}`);
    
    // Step 3: Analyze with DeepSeek
    console.log(`🧠 [ASYNC] Starting analysis for project ${projectId}...`);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: { 'analytics.processingStage': 'analyzing' }
    });
    
    const analysisResult = await analyzeContentWithDeepSeek(transcriptionResult, {
      minClipDuration: options.minClipDuration || 15,
      maxClipDuration: options.maxClipDuration || 60,
      maxClips: options.maxClips || 10,
      videoTitle: downloadResult.metadata.title || 'Video',
      videoType: options.videoType || 'general'
    });
    
    console.log(`✅ [ASYNC] Analysis completed for project ${projectId}: ${analysisResult.clips.length} clips found`);
    
    // Step 4: Save clips to database
    console.log(`💾 [ASYNC] Saving clips for project ${projectId}...`);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: { 'analytics.processingStage': 'saving' }
    });
    
    if (analysisResult.clips.length > 0) {
      const clipData = analysisResult.clips.map((clip, index) => ({
        projectId: projectId,
        userId: userId,
        title: clip.title || `${downloadResult.metadata.title} - Clip ${index + 1}`,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        viralityScore: clip.viralityScore,
        status: 'ready',
        aiAnalysis: {
          source: 'deepseek-v3',
          reason: clip.reason,
          engagementType: clip.engagementType,
          contentTags: clip.contentTags || [],
          hasSetup: clip.hasSetup,
          hasPayoff: clip.hasPayoff,
          analyzedAt: clip.analyzedAt
        }
      }));
      
      const savedClips = await VideoClip.insertMany(clipData);
      console.log(`✅ [ASYNC] Saved ${savedClips.length} clips for project ${projectId}`);
      
      // Update project with final results - keep in saving stage until clips are confirmed available
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'processing', // Keep processing until clips are confirmed available
          processingCompleted: new Date(),
          'analytics.totalClipsGenerated': savedClips.length,
          'analytics.processingStage': 'saving', // Stay in saving stage
          transcription: {
            text: transcriptionResult.text,
            language: transcriptionResult.language,
            segments: transcriptionResult.segments,
            duration: transcriptionResult.duration,
            source: 'whisper',
            processingCost: transcriptionResult.estimatedCost,
            processedAt: new Date()
          },
          aiAnalysis: {
            model: 'deepseek-chat-v3',
            totalCost: analysisResult.cost,
            processingTime: analysisResult.processingTime,
            promptTokens: analysisResult.metadata?.promptTokens,
            responseTokens: analysisResult.metadata?.responseTokens,
            analyzedAt: new Date()
          }
        }
      });
      
      console.log(`🎬 [ASYNC] Clip metadata saved, starting video processing for project ${projectId}...`);
      
      // Step 5: Process actual video clips (cut videos and upload to Firebase)
      try {
        console.log(`🎬 [ASYNC] Starting video clip cutting for project ${projectId}...`);
        
        const processedClips = await processClipsFromMetadata(
          downloadResult.filePath,
          savedClips.map(clip => ({
            _id: clip._id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            title: clip.title || `Clip ${clip.startTime}s`,
            viralityScore: clip.viralityScore
          })),
          projectId,
          downloadResult.metadata.title || 'Video'
        );
        
        console.log(`🎬 [ASYNC] Video cutting completed for project ${projectId}: ${processedClips.length} clips processed`);
        
        // Update clip records with generated video URLs
        let successfulUpdates = 0;
        for (const processedClip of processedClips) {
          if (!processedClip.error) {
            try {
              await VideoClip.findByIdAndUpdate(processedClip.clipId, {
                $set: {
                  title: processedClip.title,
                  generatedVideo: processedClip.generatedVideo,
                  status: 'ready'
                }
              });
              successfulUpdates++;
              console.log(`✅ [ASYNC] Updated clip ${processedClip.clipId}: "${processedClip.title}"`);
            } catch (updateError) {
              console.error(`❌ [ASYNC] Failed to update clip ${processedClip.clipId}:`, updateError);
            }
          }
        }
        
        // Now mark project as completed since clips are actually ready
        await VideoProject.findByIdAndUpdate(projectId, {
          $set: {
            status: 'completed',
            'analytics.processingStage': 'completed',
            'analytics.totalClipsGenerated': successfulUpdates,
            'analytics.lastAccessed': new Date()
          }
        });
        
        console.log(`🎉 [ASYNC] Project ${projectId} fully completed with ${successfulUpdates} clips ready to view`);
        
      } catch (processingError) {
        console.error(`❌ [ASYNC] Video clip processing failed for project ${projectId}:`, processingError);
        
        // Mark project as completed but with processing error
        await VideoProject.findByIdAndUpdate(projectId, {
          $set: {
            status: 'completed',
            'analytics.processingStage': 'completed',
            'analytics.warning': 'Clips detected but video processing failed'
          }
        });
      }
      
      // Cleanup downloaded file after all processing is complete
      try {
        const fs = require('fs');
        if (fs.existsSync(downloadResult.filePath)) {
          fs.unlinkSync(downloadResult.filePath);
          console.log(`🧹 [ASYNC] Cleaned up video file after complete processing for project ${projectId}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ [ASYNC] Failed to cleanup video file:`, cleanupError.message);
      }
    } else {
      // No clips found
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'completed',
          processingCompleted: new Date(),
          'analytics.totalClipsGenerated': 0,
          'analytics.processingStage': 'completed',
          'analytics.warning': 'No clips met the quality threshold'
        }
      });
      
      console.log(`⚠️ [ASYNC] Project ${projectId} completed but no clips found`);
    }
    
  } catch (error) {
    console.error(`❌ [ASYNC] Processing failed for project ${projectId}:`, error);
    
    // Update project with error status
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: {
        status: 'error',
        processingCompleted: new Date(),
        'analytics.processingStage': 'error',
        'analytics.error': error.message
      }
    });
    
    throw error;
  } finally {
    // Always remove the processing lock when done
    processingLocks.delete(projectId);
    console.log(`🔓 [ASYNC] Released processing lock for project ${projectId}`);
  }
}

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
    
    // For large videos, start async processing and return immediately
    if (projectId) {
      console.log(`🚀 [CLIP-API] Starting async processing for project ${projectId}...`);
      
      // Update project status to processing
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'processing',
          processingStarted: new Date(),
          'analytics.processingStage': 'downloading'
        }
      });
      
      // Start async processing (don't await)
      processVideoAsync(url, projectId, options, session.user.id)
        .catch(error => {
          console.error(`❌ [CLIP-API] Async processing failed for ${projectId}:`, error);
          // Update project to error state
          VideoProject.findByIdAndUpdate(projectId, {
            $set: {
              status: 'error',
              processingCompleted: new Date(),
              'analytics.error': error.message
            }
          }).catch(updateError => {
            console.error(`❌ [CLIP-API] Failed to update project error state:`, updateError);
          });
        });
      
      // Return immediately with job started status
      return NextResponse.json({
        success: true,
        message: 'Video processing started',
        projectId: projectId,
        status: 'processing',
        estimatedTime: '5-15 minutes for large videos'
      });
    }
    
    // Step 1: Download video
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
    
    // Step 2: Transcribe video with Whisper
    console.log(`🎤 [CLIP-API] Starting Whisper transcription...`);
    const transcriptionResult = await transcribeWithWhisper(downloadResult.filePath, {
      language: options.language || null,
      responseFormat: 'verbose_json', // Get timestamps for analysis
      temperature: 0 // Deterministic output
    });
    
    console.log(`✅ [CLIP-API] Transcription completed`);
    console.log(`📝 [CLIP-API] Transcription info:`, {
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
      segments: transcriptionResult.segments?.length || 0,
      cost: transcriptionResult.estimatedCost
    });
    
    // Step 3: Analyze content with DeepSeek for intelligent clip detection
    console.log(`🧠 [CLIP-API] Starting DeepSeek content analysis...`);
    const analysisResult = await analyzeContentWithDeepSeek(transcriptionResult, {
      minClipDuration: options.minClipDuration || 15,
      maxClipDuration: options.maxClipDuration || 60,
      maxClips: options.maxClips || 10,
      videoTitle: downloadResult.metadata.title || 'Video',
      videoType: options.videoType || 'general'
    });
    
    console.log(`🎉 [CLIP-API] Content analysis completed successfully`);
    console.log(`📊 [CLIP-API] Found ${analysisResult.clips.length} intelligent clips`);
    console.log(`💰 [CLIP-API] Total cost: Whisper $${transcriptionResult.estimatedCost} + DeepSeek $${analysisResult.cost}`);
    
    const clipResult = {
      clips: analysisResult.clips,
      transcription: transcriptionResult,
      analysis: analysisResult
    };
    
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
        
        // Create VideoClip records with AI analysis data
        const clipData = clipResult.clips.map((clip, index) => ({
          projectId: projectId,
          userId: session.user.id,
          title: clip.title || `${downloadResult.metadata.title} - Clip ${index + 1}`,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
          viralityScore: clip.viralityScore,
          status: 'ready',
          // Add AI analysis metadata
          aiAnalysis: {
            source: 'deepseek-v3',
            reason: clip.reason,
            engagementType: clip.engagementType,
            contentTags: clip.contentTags || [],
            hasSetup: clip.hasSetup,
            hasPayoff: clip.hasPayoff,
            analyzedAt: clip.analyzedAt
          }
        }));
        
        savedClips = await VideoClip.insertMany(clipData);
        console.log(`✅ [CLIP-API] Successfully saved ${savedClips.length} clips to database`);
        
        // Update project with transcription and analysis results
        await VideoProject.findByIdAndUpdate(projectId, {
          $set: {
            status: 'completed',
            processingCompleted: new Date(),
            'analytics.totalClipsGenerated': savedClips.length,
            // Save full transcription to project
            transcription: {
              text: transcriptionResult.text,
              language: transcriptionResult.language,
              segments: transcriptionResult.segments,
              duration: transcriptionResult.duration,
              source: 'whisper',
              processingCost: transcriptionResult.estimatedCost,
              processedAt: new Date()
            },
            // Save analysis metadata
            aiAnalysis: {
              model: 'deepseek-chat-v3',
              totalCost: analysisResult.cost,
              processingTime: analysisResult.processingTime,
              promptTokens: analysisResult.metadata?.promptTokens,
              responseTokens: analysisResult.metadata?.responseTokens,
              analyzedAt: new Date()
            }
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
      transcription: {
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        segments: transcriptionResult.segments?.length || 0,
        cost: transcriptionResult.estimatedCost
      },
      analysis: {
        model: 'deepseek-chat-v3',
        totalClips: analysisResult.clips.length,
        processingTime: analysisResult.processingTime,
        cost: analysisResult.cost
      },
      clips: clipResult.clips.map(clip => ({
        title: clip.title,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        viralityScore: clip.viralityScore,
        reason: clip.reason,
        engagementType: clip.engagementType,
        contentTags: clip.contentTags || [],
        hasSetup: clip.hasSetup,
        hasPayoff: clip.hasPayoff
      })),
      costs: {
        whisper: transcriptionResult.estimatedCost,
        deepseek: analysisResult.cost,
        total: (transcriptionResult.estimatedCost + analysisResult.cost).toFixed(6)
      },
      savedClips: savedClips.length
    };
    
    console.log(`✅ [CLIP-API] Returning successful response with ${response.clips.length} clips`);
    console.log(`💰 [CLIP-API] Total processing cost: $${response.costs.total}`);
    
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