/**
 * Video Processing Service for Sharing
 * Handles processing clips with templates and captions before sharing to social media
 */

import { processVideoWithTemplate } from '@/app/lib/video-processing/services/templateProcessor';
import { uploadProcessedClip } from '@/app/lib/storage/firebase';
import fs from 'fs/promises';

/**
 * Check if clip has template applied
 * @param {Object} templateData - Template settings
 * @returns {boolean}
 */
function hasTemplate(templateData) {
  if (!templateData) return false;

  const template = templateData.template?.toLowerCase();

  // Blank/default templates don't count as "having a template"
  if (!template || template === 'default' || template === 'blank') {
    return false;
  }

  return true;
}

/**
 * Check if clip has captions applied
 * @param {Object} captionData - Caption data with captions array
 * @param {Object} captionSettings - Caption styling settings
 * @returns {boolean}
 */
function hasCaptions(captionData, captionSettings) {
  if (!captionData || !captionSettings) return false;

  // Check if captions array exists and has items
  if (!captionData.captions || captionData.captions.length === 0) {
    return false;
  }

  return true;
}

/**
 * Get the correct video URL based on template preference
 * @param {Object} clip - Clip object with video URLs
 * @param {Object} templateData - Template settings
 * @returns {string} The appropriate video URL
 */
function getVideoUrlForTemplate(clip, templateData) {
  // Template preferences mapping (same as ClipCard)
  const templatePreferences = {
    'social-profile': 'horizontal',  // Sonnet prefers horizontal (2.35:1)
    'title-only': 'horizontal',      // Focus prefers horizontal (2.35:1)
    'default': 'vertical',           // Blank prefers vertical (9:16)
    'bw-frame': 'vertical'           // B&W prefers vertical (9:16)
  };

  if (!templateData || !templateData.template) {
    // No template, default to vertical
    console.log('📹 [VIDEO-SELECT] No template, using vertical video');
    return clip.verticalVideoUrl || clip.videoUrl || clip.url;
  }

  const template = templateData.template.toLowerCase();
  const preferredOrientation = templatePreferences[template] || 'vertical';

  console.log('📹 [VIDEO-SELECT] Template:', template, '→ Preferred orientation:', preferredOrientation);

  // Get the appropriate video URL based on preference
  if (preferredOrientation === 'horizontal' && clip.horizontalVideoUrl) {
    console.log('✅ [VIDEO-SELECT] Using horizontal video (2.35:1) for', template);
    return clip.horizontalVideoUrl;
  } else if (preferredOrientation === 'vertical' && clip.verticalVideoUrl) {
    console.log('✅ [VIDEO-SELECT] Using vertical video (9:16) for', template);
    return clip.verticalVideoUrl;
  }

  // Fallback to default URL
  console.log('⚠️ [VIDEO-SELECT] Falling back to default URL');
  return clip.videoUrl || clip.url;
}

/**
 * Process clip with template & captions before sharing
 * @param {Object} clip - Clip object from database
 * @param {Object} templateData - Template settings from clip or templateStore
 * @param {Object} captionData - Caption data with captions array
 * @param {Object} captionSettings - Caption settings (font, size, position, weight)
 * @returns {Promise<string>} Processed video Firebase URL or original URL
 */
export async function processClipForSharing(clip, templateData, captionData, captionSettings) {
  try {
    console.log('🎬 [VIDEO-PROCESSING] Starting clip processing for sharing');
    console.log('📋 [VIDEO-PROCESSING] Clip ID:', clip.id);
    console.log('🎨 [VIDEO-PROCESSING] Has template:', hasTemplate(templateData));
    console.log('📝 [VIDEO-PROCESSING] Has captions:', hasCaptions(captionData, captionSettings));

    // Get the correct video URL based on template preference
    const videoUrl = getVideoUrlForTemplate(clip, templateData);

    // Validate video URL is accessible
    console.log('🔍 [VIDEO-PROCESSING] Validating video URL accessibility...');
    try {
      const headResponse = await fetch(videoUrl, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Video URL returned ${headResponse.status}: ${videoUrl}`);
      }
      console.log('✅ [VIDEO-PROCESSING] Video URL is accessible');
    } catch (urlError) {
      console.error('❌ [VIDEO-PROCESSING] Video URL is not accessible:', urlError.message);
      throw new Error(`Video file not found or inaccessible. The video may have been deleted from storage. Please regenerate this clip.`);
    }

    // Check if clip needs processing
    const needsTemplateProcessing = hasTemplate(templateData);
    const needsCaptionProcessing = hasCaptions(captionData, captionSettings);

    if (!needsTemplateProcessing && !needsCaptionProcessing) {
      console.log('⚡ [VIDEO-PROCESSING] No processing needed, returning raw video URL');
      return videoUrl; // Return raw video
    }

    console.log('🔄 [VIDEO-PROCESSING] Processing required, using templateProcessor service');

    // Log what will be processed
    if (needsTemplateProcessing) {
      console.log('🎨 [VIDEO-PROCESSING] Adding template:', templateData.template);
    }
    if (needsCaptionProcessing) {
      console.log('📝 [VIDEO-PROCESSING] Adding captions:', captionData.captions?.length, 'captions');
    }

    // Process video using shared templateProcessor service
    const processedVideoPath = await processVideoWithTemplate(
      videoUrl, // Use the selected video URL based on template preference
      needsTemplateProcessing ? templateData : null,
      needsCaptionProcessing ? captionData : null,
      needsCaptionProcessing ? captionSettings : null
    );

    console.log('✅ [VIDEO-PROCESSING] Video processing complete, file path:', processedVideoPath);

    // Read the processed video file
    const videoBuffer = await fs.readFile(processedVideoPath);
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    console.log('📦 [VIDEO-PROCESSING] Video blob size:', videoBlob.size, 'bytes');

    // Upload processed video to Firebase
    console.log('☁️ [VIDEO-PROCESSING] Uploading to Firebase Storage...');
    const processedUrl = await uploadProcessedClip(videoBlob, clip.id);

    // Cleanup temporary file
    await fs.unlink(processedVideoPath);
    console.log('🧹 [VIDEO-PROCESSING] Cleaned up temporary file');

    console.log('✅ [VIDEO-PROCESSING] Processing complete!');
    console.log('🔗 [VIDEO-PROCESSING] Processed video URL:', processedUrl);

    return processedUrl;

  } catch (error) {
    console.error('❌ [VIDEO-PROCESSING] Error processing clip:', error);
    console.error('❌ [VIDEO-PROCESSING] Error details:', error.message);

    // Don't fallback to potentially broken URLs - throw the error
    // This will bubble up to the share API and show a meaningful error to the user
    throw error;
  }
}


/**
 * Process multiple clips for sharing (batch processing)
 * @param {Array<Object>} clips - Array of clip objects
 * @param {Object} templateData - Template settings
 * @param {Object} captionSettings - Caption settings
 * @returns {Promise<Array<Object>>} Array of { clipId, processedUrl }
 */
export async function processMultipleClipsForSharing(clips, templateData, captionSettings) {
  console.log('🎬 [BATCH-PROCESSING] Starting batch processing for', clips.length, 'clips');

  const results = [];

  // Process clips sequentially to avoid overwhelming the system
  for (const clip of clips) {
    try {
      const processedUrl = await processClipForSharing(
        clip,
        templateData,
        clip.captions, // Each clip has its own caption data
        captionSettings
      );

      results.push({
        clipId: clip.id,
        processedUrl,
        success: true
      });

      console.log('✅ [BATCH-PROCESSING] Processed clip:', clip.id);

    } catch (error) {
      console.error('❌ [BATCH-PROCESSING] Failed to process clip:', clip.id, error);

      results.push({
        clipId: clip.id,
        processedUrl: clip.verticalVideoUrl || clip.videoUrl, // Fallback to raw
        success: false,
        error: error.message
      });
    }
  }

  console.log('✅ [BATCH-PROCESSING] Batch processing complete');
  console.log('📊 [BATCH-PROCESSING] Success:', results.filter(r => r.success).length, '/', results.length);

  return results;
}

/**
 * Get clip template and caption data for processing
 * Helper function to retrieve stored settings from clip object
 * @param {Object} clip - Clip object from database
 * @returns {Object} { templateData, captionData, captionSettings }
 */
export function getClipProcessingData(clip) {
  return {
    templateData: clip.templateSettings || null,
    captionData: clip.captions || null,
    captionSettings: clip.captionSettings || null
  };
}
