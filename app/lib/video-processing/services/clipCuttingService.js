import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { uploadClipperThumbnail } from '@/app/lib/storage/firebase';
import { transcribeWithWhisper } from './openaiWhisperService';
import { generateCaptionData, generateFFmpegCaptionFilters } from './captionService';

/**
 * Video Clip Cutting Service
 * Uses FFmpeg to cut video clips based on database metadata and extract audio for transcription
 */

/**
 * Cut video clip using FFmpeg with optional aspect ratio conversion and captions
 */
export const cutVideoClip = async (inputVideoPath, startTime, endTime, outputPath = '/tmp', options = {}) => {
  console.log(`🎬 [CLIP-CUTTER] Cutting clip: ${startTime}s - ${endTime}s`);
  console.log(`📹 [CLIP-CUTTER] Input video: ${inputVideoPath}`);
  
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    const timestamp = Date.now();
    const { aspectRatio = 'original', platform = 'none', captionData = null, enableCaptions = true, captionPosition = 'bottom' } = options;
    
    // Initialize global filter script flags
    global.useFilterScript = false;
    global.tempFilterScriptPath = null;
    global.tempTextFiles = null;
    
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
    
    // Build video filter chain
    const videoFilters = [];
    let needsReencoding = false;
    
    // Add aspect ratio conversion based on platform
    if (aspectRatio === '9:16' || platform === 'tiktok' || platform === 'reels' || platform === 'shorts') {
      console.log(`🎯 [CLIP-CUTTER] Converting to 9:16 aspect ratio for ${platform || 'vertical'} format`);
      videoFilters.push('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920');
      needsReencoding = true;
    }
    
    // Add captions if provided and enabled
    if (enableCaptions && captionData && captionData.captions && captionData.captions.length > 0) {
      console.log(`📝 [CLIP-CUTTER] Adding captions: ${captionData.captions.length} caption segments`);
      console.log(`🎨 [CLIP-CUTTER] Caption platform: ${captionData.platform || platform}`);
      
      // Generate caption filters (adjust timestamps relative to clip start)
      // First filter captions that overlap with clip timespan
      const clipStartTime = startTime;
      const clipEndTime = endTime;
      
      const overlappingCaptions = captionData.captions.filter(caption => {
        // Caption overlaps if it starts before clip ends and ends after clip starts
        return caption.startTime < clipEndTime && caption.endTime > clipStartTime;
      });
      
      console.log(`🎯 [CLIP-CUTTER] Found ${overlappingCaptions.length}/${captionData.captions.length} captions overlapping with clip timespan (${clipStartTime}s-${clipEndTime}s)`);
      
      // Then adjust timestamps to be relative to clip start (0-duration)
      const adjustedCaptionData = {
        ...captionData,
        captions: overlappingCaptions.map(caption => ({
          ...caption,
          startTime: Math.max(0, caption.startTime - clipStartTime), // Adjust for clip start time
          endTime: Math.min(duration, caption.endTime - clipStartTime) // Adjust and clamp to clip end
        })).filter(caption => caption.endTime > caption.startTime && caption.startTime < duration) // Remove invalid captions
      };
      
      console.log(`✅ [CLIP-CUTTER] Adjusted ${adjustedCaptionData.captions.length} captions for clip timing (0-${duration}s)`);
      
      const captionResult = generateFFmpegCaptionFilters(adjustedCaptionData, {
        videoWidth: 1080,
        videoHeight: 1920,
        position: captionPosition,
        tempDir: '/tmp'
      });
      
      if (captionResult.filters && captionResult.filters.length > 0) {
        needsReencoding = true;
        console.log(`✅ [CLIP-CUTTER] Generated ${captionResult.filters.length} caption filters using textfile approach`);
        
        // Create temporary text files for each caption
        const createdTextFiles = [];
        for (const textFile of captionResult.textFiles) {
          try {
            fs.writeFileSync(textFile.path, textFile.content, 'utf8');
            createdTextFiles.push(textFile.path);
            console.log(`📄 [CLIP-CUTTER] Created text file: ${textFile.path} (${textFile.content.length} chars)`);
          } catch (error) {
            console.error(`❌ [CLIP-CUTTER] Failed to create text file ${textFile.path}:`, error);
          }
        }
        
        // Store created text files for cleanup later
        global.tempTextFiles = createdTextFiles;
        
        // Create filter script file to bypass command line length limits
        const filterScriptPath = `/tmp/filter_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`;
        
        // Combine video processing and caption filters
        const allFilters = [...videoFilters, ...captionResult.filters];
        const filterChain = allFilters.join(',');
        
        // Filter script needs proper filtergraph syntax: [0:v]filter1,filter2[out]
        const filterGraphContent = `[0:v]${filterChain}[v]`;
        
        // Write filter graph to temporary file
        fs.writeFileSync(filterScriptPath, filterGraphContent, 'utf8');
        console.log(`📝 [CLIP-CUTTER] Created filter script: ${filterScriptPath}`);
        console.log(`📊 [CLIP-CUTTER] Filter chain length: ${filterChain.length} characters (${captionResult.filters.length} caption filters)`);
        console.log(`📁 [CLIP-CUTTER] Created ${createdTextFiles.length} temporary text files for captions`);
        
        // Clear videoFilters since they're now in the script file
        videoFilters.length = 0;
        
        // Mark to use filter script instead of inline filters
        global.tempFilterScriptPath = filterScriptPath;
        global.useFilterScript = true;
      } else {
        console.log(`⚠️ [CLIP-CUTTER] No caption filters generated (captions may be outside clip duration)`);
      }
    } else if (enableCaptions && (!captionData || !captionData.captions || captionData.captions.length === 0)) {
      console.log(`⚠️ [CLIP-CUTTER] Captions enabled but no caption data provided`);
    } else {
      console.log(`📝 [CLIP-CUTTER] Captions disabled for this clip`);
    }
    
    // Apply video filters and encoding options
    if (global.useFilterScript && global.tempFilterScriptPath) {
      // Use filter script file to bypass command line length limits
      console.log(`🎬 [CLIP-CUTTER] Using filter script file: ${global.tempFilterScriptPath}`);
      
      args.push(
        '-filter_complex_script', global.tempFilterScriptPath,
        '-map', '[v]',               // Map the filtered video output
        '-map', '0:a',               // Map original audio
        '-c:v', 'libx264',           // Re-encode video
        '-c:a', 'aac',               // Re-encode audio to AAC
        '-preset', 'medium',         // Encoding preset (balance between speed and quality)
        '-crf', '23'                 // Quality setting (lower = better quality)
      );
    } else if (needsReencoding && videoFilters.length > 0) {
      const filterChain = videoFilters.join(',');
      console.log(`🎬 [CLIP-CUTTER] Applying video filter chain: ${filterChain.substring(0, 200)}${filterChain.length > 200 ? '...' : ''}`);
      
      args.push(
        '-vf', filterChain,
        '-c:v', 'libx264',           // Re-encode video
        '-c:a', 'aac',               // Re-encode audio to AAC
        '-preset', 'medium',         // Encoding preset (balance between speed and quality)
        '-crf', '23'                 // Quality setting (lower = better quality)
      );
    } else {
      // No filters needed - just copy streams
      console.log(`⚡ [CLIP-CUTTER] No video processing needed, copying streams`);
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
      
      // Clean up temporary filter script file
      if (global.tempFilterScriptPath && fs.existsSync(global.tempFilterScriptPath)) {
        try {
          fs.unlinkSync(global.tempFilterScriptPath);
          console.log(`🧹 [CLIP-CUTTER] Cleaned up filter script: ${global.tempFilterScriptPath}`);
        } catch (error) {
          console.warn(`⚠️ [CLIP-CUTTER] Failed to cleanup filter script: ${error.message}`);
        }
        // Reset global flags
        global.useFilterScript = false;
        global.tempFilterScriptPath = null;
      }
      
      // Clean up temporary text files for captions
      if (global.tempTextFiles && Array.isArray(global.tempTextFiles)) {
        let cleanedCount = 0;
        for (const textFilePath of global.tempTextFiles) {
          try {
            if (fs.existsSync(textFilePath)) {
              fs.unlinkSync(textFilePath);
              cleanedCount++;
            }
          } catch (error) {
            console.warn(`⚠️ [CLIP-CUTTER] Failed to cleanup text file ${textFilePath}: ${error.message}`);
          }
        }
        console.log(`🧹 [CLIP-CUTTER] Cleaned up ${cleanedCount}/${global.tempTextFiles.length} temporary text files`);
        global.tempTextFiles = null;
      }
      
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
export const processClipsFromMetadata = async (inputVideoPath, clipsMetadata, projectId, originalVideoTitle = 'Video', transcriptionData = null, options = {}) => {
  console.log(`🎬 [CLIP-PROCESSOR] Processing ${clipsMetadata.length} clips from metadata for project ${projectId}`);
  console.log(`📹 [CLIP-PROCESSOR] Input video: ${inputVideoPath}`);
  
  // Extract caption options
  const {
    enableCaptions = true,
    captionStyle = 'tiktok',
    maxWordsPerLine = 3,
    captionPosition = 'bottom',
    customCaptionSettings = {}
  } = options;
  
  console.log(`📝 [CLIP-PROCESSOR] Caption settings: enabled=${enableCaptions}, style=${captionStyle}, position=${captionPosition}`);
  
  // Generate caption data from transcription if available and enabled
  let captionData = null;
  if (enableCaptions && transcriptionData && transcriptionData.words && transcriptionData.words.length > 0) {
    console.log(`📝 [CLIP-PROCESSOR] Generating captions from ${transcriptionData.words.length} words`);
    
    // Log word timestamp range for debugging
    const firstWord = transcriptionData.words[0];
    const lastWord = transcriptionData.words[transcriptionData.words.length - 1];
    console.log(`📊 [CLIP-PROCESSOR] Word timestamp range: ${firstWord.start.toFixed(1)}s to ${lastWord.end.toFixed(1)}s`);
    
    captionData = generateCaptionData(transcriptionData.words, {
      maxWordsPerLine,
      platform: captionStyle,
      minDisplayTime: 0.5,
      ...customCaptionSettings
    });
    
    // Log caption timestamp range for debugging
    if (captionData.captions.length > 0) {
      const firstCaption = captionData.captions[0];
      const lastCaption = captionData.captions[captionData.captions.length - 1];
      console.log(`📊 [CLIP-PROCESSOR] Caption timestamp range: ${firstCaption.startTime.toFixed(1)}s to ${lastCaption.endTime.toFixed(1)}s`);
      console.log(`✅ [CLIP-PROCESSOR] Generated captions: ${captionData.captions.length} segments for ${captionStyle} format`);
    }
  } else if (!enableCaptions) {
    console.log(`📝 [CLIP-PROCESSOR] Captions disabled by user setting`);
  } else {
    console.log(`⚠️ [CLIP-PROCESSOR] No transcription data available for captions`);
  }
  
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
          platform: captionStyle, // Use caption style as platform
          captionData: captionData,
          enableCaptions: enableCaptions,
          captionPosition: captionPosition
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
      
      // Step 3: Use DeepSeek-generated title from metadata
      console.log(`🎙️ [CLIP-PROCESSOR] Step 3: Using DeepSeek-generated title from metadata...`);
      
      // Use the DeepSeek-generated title if available, otherwise fallback to original video title
      const generatedTitle = clipMeta.title || `${originalVideoTitle} - ${clipMeta.startTime}s`;
      console.log(`🏷️ [CLIP-PROCESSOR] Using title: "${generatedTitle}"`);
      console.log(`📊 [CLIP-PROCESSOR] Title source: ${clipMeta.title ? 'DeepSeek analysis' : 'fallback'}`);
      console.log(`📋 [CLIP-PROCESSOR] AI Analysis: ${clipMeta.reason || 'N/A'}`);
      console.log(`🎯 [CLIP-PROCESSOR] Engagement type: ${clipMeta.engagementType || 'N/A'}`);
      console.log(`🏷️ [CLIP-PROCESSOR] Content tags: ${clipMeta.contentTags ? clipMeta.contentTags.join(', ') : 'N/A'}`);
      
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