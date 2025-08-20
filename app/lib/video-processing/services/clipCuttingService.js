import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { uploadClipperThumbnail } from '@/app/lib/storage/firebase';
import { transcribeWithWhisper } from './openaiWhisperService';

/**
 * Video Clip Cutting Service
 * Uses FFmpeg to cut video clips based on database metadata and extract audio for transcription
 */

/**
 * Cut video clip using FFmpeg with optional aspect ratio conversion
 */
export const cutVideoClip = async (inputVideoPath, startTime, endTime, outputPath = '/tmp', options = {}) => {
  console.log(`🎬 [CLIP-CUTTER] Cutting clip: ${startTime}s - ${endTime}s`);
  console.log(`📹 [CLIP-CUTTER] Input video: ${inputVideoPath}`);
  
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    const timestamp = Date.now();
    const { aspectRatio = 'original', platform = 'none' } = options;
    
    // Add platform suffix to filename if specified
    const platformSuffix = platform !== 'none' ? `_${platform}` : '';
    const outputFileName = `clip_${timestamp}_${startTime}s-${endTime}s${platformSuffix}.mp4`;
    const outputFilePath = path.join(outputPath, outputFileName);
    
    console.log(`📁 [CLIP-CUTTER] Output file: ${outputFilePath}`);
    console.log(`⏱️ [CLIP-CUTTER] Duration: ${duration}s`);
    console.log(`📱 [CLIP-CUTTER] Target platform: ${platform}`);
    console.log(`📐 [CLIP-CUTTER] Aspect ratio: ${aspectRatio}`);
    
    // Base FFmpeg arguments - OPTIMIZED: Use input seek for faster processing of large files
    // Input seek (-ss before -i) is much faster for large files, especially with long seek times
    const args = [
      '-ss', startTime.toString(),   // Start time (BEFORE input for fast seek)
      '-i', inputVideoPath,          // Input file
      '-t', duration.toString(),     // Duration (not end time)
    ];
    
    // Add aspect ratio conversion based on platform
    if (aspectRatio === '9:16' || platform === 'tiktok' || platform === 'reels' || platform === 'shorts') {
      console.log(`🎯 [CLIP-CUTTER] Converting to 9:16 aspect ratio for ${platform || 'vertical'} format`);
      
      // Add video filters for 9:16 conversion
      args.push(
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', // Scale to 1080x1920 and crop
        '-c:v', 'libx264',           // Re-encode video for aspect ratio change
        '-c:a', 'aac',               // Re-encode audio to AAC
        '-preset', 'medium',         // Encoding preset (balance between speed and quality)
        '-crf', '23'                 // Quality setting (lower = better quality)
      );
    } else {
      // Original aspect ratio - just copy streams
      args.push(
        '-c', 'copy'                 // Copy streams without re-encoding (faster)
      );
    }
    
    // Add final arguments
    args.push(
      '-avoid_negative_ts', 'make_zero', // Handle negative timestamps
      '-y',                          // Overwrite output file
      outputFilePath
    );
    
    console.log(`🔧 [CLIP-CUTTER] FFmpeg command: ffmpeg ${args.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stdout.on('data', (data) => {
      // FFmpeg outputs to stderr, not stdout
    });
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log progress if available
      const progressMatch = data.toString().match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (progressMatch) {
        console.log(`⏳ [CLIP-CUTTER] Progress: ${progressMatch[1]}`);
      }
    });
    
    ffmpeg.on('close', (code) => {
      console.log(`🏁 [CLIP-CUTTER] FFmpeg process exited with code: ${code}`);
      
      if (code === 0 && fs.existsSync(outputFilePath)) {
        const fileStats = fs.statSync(outputFilePath);
        console.log(`✅ [CLIP-CUTTER] Clip created successfully`);
        console.log(`📊 [CLIP-CUTTER] File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
        
        resolve({
          success: true,
          filePath: outputFilePath,
          fileName: outputFileName,
          size: fileStats.size,
          duration: duration
        });
      } else {
        console.error(`❌ [CLIP-CUTTER] Failed to create clip`);
        console.error(`📝 [CLIP-CUTTER] FFmpeg stderr:`, stderr.substring(0, 500));
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.substring(0, 200)}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error(`❌ [CLIP-CUTTER] FFmpeg process error:`, error.message);
      reject(new Error(`FFmpeg process failed: ${error.message}`));
    });
  });
};

/**
 * Extract audio segment for Whisper transcription
 */
export const extractAudioSegment = async (inputVideoPath, startTime, endTime, outputPath = '/tmp') => {
  console.log(`🎵 [AUDIO-EXTRACT] Extracting audio: ${startTime}s - ${endTime}s`);
  
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    const timestamp = Date.now();
    const outputFileName = `audio_${timestamp}_${startTime}s-${endTime}s.wav`;
    const outputFilePath = path.join(outputPath, outputFileName);
    
    console.log(`🎵 [AUDIO-EXTRACT] Output audio: ${outputFilePath}`);
    
    // FFmpeg command to extract audio - OPTIMIZED: Use input seek for faster processing
    const args = [
      '-ss', startTime.toString(),   // Start time (BEFORE input for fast seek)
      '-i', inputVideoPath,          // Input file
      '-t', duration.toString(),     // Duration
      '-vn',                         // No video
      '-acodec', 'pcm_s16le',       // Audio codec for Whisper
      '-ar', '16000',               // Sample rate 16kHz (Whisper requirement)
      '-ac', '1',                   // Mono audio
      '-y',                         // Overwrite output file
      outputFilePath
    ];
    
    console.log(`🔧 [AUDIO-EXTRACT] FFmpeg command: ffmpeg ${args.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      console.log(`🏁 [AUDIO-EXTRACT] FFmpeg process exited with code: ${code}`);
      
      if (code === 0 && fs.existsSync(outputFilePath)) {
        const fileStats = fs.statSync(outputFilePath);
        console.log(`✅ [AUDIO-EXTRACT] Audio extracted successfully`);
        console.log(`📊 [AUDIO-EXTRACT] File size: ${(fileStats.size / 1024).toFixed(2)} KB`);
        
        resolve({
          success: true,
          filePath: outputFilePath,
          fileName: outputFileName,
          size: fileStats.size
        });
      } else {
        console.error(`❌ [AUDIO-EXTRACT] Failed to extract audio`);
        console.error(`📝 [AUDIO-EXTRACT] FFmpeg stderr:`, stderr.substring(0, 500));
        reject(new Error(`Audio extraction failed with code ${code}: ${stderr.substring(0, 200)}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error(`❌ [AUDIO-EXTRACT] FFmpeg process error:`, error.message);
      reject(new Error(`FFmpeg process failed: ${error.message}`));
    });
  });
};

/**
 * Generate clip title using Whisper transcription
 */
export const generateClipTitle = async (audioFilePath, fallbackTitle = 'Untitled Clip') => {
  console.log(`🎙️ [TITLE-GEN] Generating title from audio: ${audioFilePath}`);
  
  try {
    // Use Whisper to transcribe the audio segment
    const transcriptionResult = await transcribeWithWhisper(audioFilePath);
    
    if (transcriptionResult.success && transcriptionResult.text) {
      let transcriptionText = transcriptionResult.text.trim();
      console.log(`✅ [TITLE-GEN] Transcription: "${transcriptionText}"`);
      
      // Clean up and create a good title
      let title = transcriptionText;
      
      // Remove common filler words/sounds
      title = title.replace(/\b(um|uh|er|ah|like|you know|so)\b/gi, '');
      
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      // Truncate to reasonable length
      if (title.length > 60) {
        title = title.substring(0, 60).trim();
        // Try to end at a word boundary
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 30) {
          title = title.substring(0, lastSpace);
        }
        title += '...';
      }
      
      // If title is too short or empty, use fallback
      if (!title || title.length < 3) {
        console.log(`⚠️ [TITLE-GEN] Transcription too short, using fallback`);
        return fallbackTitle;
      }
      
      console.log(`🏷️ [TITLE-GEN] Generated title: "${title}"`);
      return title;
      
    } else {
      console.log(`⚠️ [TITLE-GEN] Transcription failed, using fallback title`);
      return fallbackTitle;
    }
    
  } catch (error) {
    console.error(`❌ [TITLE-GEN] Error generating title:`, error.message);
    return fallbackTitle;
  }
};

/**
 * Process clips from database metadata: cut video, extract audio, generate titles, upload to Firebase
 */
export const processClipsFromMetadata = async (inputVideoPath, clipsMetadata, projectId, originalVideoTitle = 'Video') => {
  console.log(`🎬 [CLIP-PROCESSOR] Processing ${clipsMetadata.length} clips from metadata for project ${projectId}`);
  console.log(`📹 [CLIP-PROCESSOR] Input video: ${inputVideoPath}`);
  
  const processedClips = [];
  
  for (let i = 0; i < clipsMetadata.length; i++) {
    const clipMeta = clipsMetadata[i];
    console.log(`\n🎯 [CLIP-PROCESSOR] Processing clip ${i + 1}/${clipsMetadata.length}`);
    console.log(`📊 [CLIP-PROCESSOR] Metadata ID: ${clipMeta.id || clipMeta._id}`);
    console.log(`⏰ [CLIP-PROCESSOR] Time: ${clipMeta.startTime}s - ${clipMeta.endTime}s`);
    console.log(`🎯 [CLIP-PROCESSOR] Score: ${clipMeta.viralityScore}/100`);
    
    try {
      // Step 1: Cut video clip using metadata timestamps with 9:16 aspect ratio
      console.log(`🎬 [CLIP-PROCESSOR] Step 1: Cutting video from metadata for vertical format...`);
      console.log(`📹 [CLIP-PROCESSOR] Input video exists: ${fs.existsSync(inputVideoPath)}`);
      console.log(`📊 [CLIP-PROCESSOR] Input video size: ${fs.existsSync(inputVideoPath) ? (fs.statSync(inputVideoPath).size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
      
      const videoResult = await cutVideoClip(
        inputVideoPath,
        clipMeta.startTime,
        clipMeta.endTime,
        '/tmp',
        { 
          aspectRatio: '9:16', 
          platform: 'tiktok' // Default to TikTok format (can be made configurable later)
        }
      );
      
      console.log(`✅ [CLIP-PROCESSOR] Video cutting result:`, {
        success: videoResult.success,
        filePath: videoResult.filePath,
        fileName: videoResult.fileName,
        size: `${(videoResult.size / 1024 / 1024).toFixed(2)} MB`
      });
      
      // Step 2: Extract audio for transcription
      console.log(`🎵 [CLIP-PROCESSOR] Step 2: Extracting audio...`);
      const audioResult = await extractAudioSegment(
        inputVideoPath,
        clipMeta.startTime,
        clipMeta.endTime
      );
      
      // Step 3: Generate title using Whisper (temporarily disabled for testing)
      console.log(`🎙️ [CLIP-PROCESSOR] Step 3: Generating title with Whisper...`);
      console.log(`⚠️ [CLIP-PROCESSOR] Whisper temporarily disabled, using original video title`);
      
      // Use original video title as fallback instead of generic "Clip at Xs"
      const fallbackTitle = `${originalVideoTitle} - ${clipMeta.startTime}s`;
      const generatedTitle = fallbackTitle;
      
      // Step 4: Upload video to Firebase
      console.log(`☁️ [CLIP-PROCESSOR] Step 4: Uploading video to Firebase...`);
      console.log(`📁 [CLIP-PROCESSOR] Video file path: ${videoResult.filePath}`);
      console.log(`📊 [CLIP-PROCESSOR] Video file size: ${(videoResult.size / 1024 / 1024).toFixed(2)} MB`);
      
      const videoFile = fs.readFileSync(videoResult.filePath);
      console.log(`📦 [CLIP-PROCESSOR] Read video file buffer: ${(videoFile.length / 1024 / 1024).toFixed(2)} MB`);
      
      const uploadKey = `${projectId}_clip_${clipMeta.startTime}s`;
      console.log(`🏷️ [CLIP-PROCESSOR] Upload key: ${uploadKey}`);
      
      const videoUploadResult = await uploadClipperThumbnail(
        videoFile,
        uploadKey,
        'mp4'
      );
      
      console.log(`✅ [CLIP-PROCESSOR] Firebase upload result:`, {
        url: videoUploadResult.downloadURL,
        name: videoUploadResult.name,
        size: videoUploadResult.size
      });
      
      // Step 5: Cleanup temporary files
      console.log(`🧹 [CLIP-PROCESSOR] Step 5: Cleaning up temp files...`);
      try {
        fs.unlinkSync(videoResult.filePath);
        fs.unlinkSync(audioResult.filePath);
        console.log(`✅ [CLIP-PROCESSOR] Cleaned up temp files`);
      } catch (cleanupError) {
        console.warn(`⚠️ [CLIP-PROCESSOR] Cleanup warning:`, cleanupError.message);
      }
      
      const processedClip = {
        clipId: clipMeta.id || clipMeta._id,
        title: generatedTitle,
        startTime: clipMeta.startTime,
        endTime: clipMeta.endTime,
        duration: clipMeta.duration,
        viralityScore: clipMeta.viralityScore,
        generatedVideo: {
          url: videoUploadResult.downloadURL,
          format: 'mp4',
          size: videoResult.size,
          duration: videoResult.duration,
          resolution: '720p' // Based on download quality
        }
      };
      
      processedClips.push(processedClip);
      console.log(`✅ [CLIP-PROCESSOR] Clip ${i + 1} processed successfully`);
      console.log(`🏷️ [CLIP-PROCESSOR] Title: "${generatedTitle}"`);
      console.log(`☁️ [CLIP-PROCESSOR] Firebase URL: ${videoUploadResult.downloadURL}`);
      
    } catch (error) {
      console.error(`❌ [CLIP-PROCESSOR] Error processing clip ${i + 1}:`, error.message);
      
      // Add clip with error status
      processedClips.push({
        clipId: clipMeta.id || clipMeta._id,
        title: `Error: ${clipMeta.title || 'Processing failed'}`,
        startTime: clipMeta.startTime,
        endTime: clipMeta.endTime,
        duration: clipMeta.duration,
        viralityScore: clipMeta.viralityScore,
        error: error.message,
        generatedVideo: null
      });
    }
  }
  
  console.log(`\n🏁 [CLIP-PROCESSOR] Processing complete!`);
  console.log(`✅ [CLIP-PROCESSOR] Successfully processed: ${processedClips.filter(c => !c.error).length}/${clipsMetadata.length}`);
  console.log(`❌ [CLIP-PROCESSOR] Failed: ${processedClips.filter(c => c.error).length}/${clipsMetadata.length}`);
  
  return processedClips;
};

/**
 * Cleanup temporary file
 */
export const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 [CLEANUP] Removed temp file: ${filePath}`);
    }
  } catch (error) {
    console.warn(`⚠️ [CLEANUP] Failed to remove temp file:`, error.message);
  }
};