/**
 * Caption Service
 * Generates dynamic captions with word-level timing for video clips
 * Supports different platforms (TikTok, Instagram, YouTube) with custom styling
 */

/**
 * Generate caption data from Whisper word-level timestamps
 * @param {Array} words - Word-level timestamps from Whisper
 * @param {Object} options - Caption options
 * @returns {Object} - Caption data structure
 */
export function generateCaptionData(words, options = {}) {
  const {
    maxWordsPerLine = 3, // Maximum words per caption line
    minDisplayTime = 0.5, // Minimum time to show each caption (seconds)
    platform = 'tiktok', // Platform-specific styling
    fontSize = 40,
    fontColor = 'white',
    outlineColor = 'black',
    backgroundColor = 'transparent'
  } = options;

  if (!words || words.length === 0) {
    console.log('⚠️ [CAPTIONS] No words provided for caption generation');
    return { captions: [], totalDuration: 0 };
  }

  console.log(`🎬 [CAPTIONS] Generating captions for ${words.length} words`);
  console.log(`📱 [CAPTIONS] Platform: ${platform}, Max words per line: ${maxWordsPerLine}`);

  const captions = [];
  let currentCaption = {
    words: [],
    startTime: null,
    endTime: null,
    text: ''
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Start new caption if empty or reached max words per line
    if (currentCaption.words.length === 0) {
      currentCaption.startTime = word.start;
      currentCaption.words.push(word);
      currentCaption.text = word.word;
    } else if (currentCaption.words.length < maxWordsPerLine) {
      // Add word to current caption
      currentCaption.words.push(word);
      currentCaption.text += ' ' + word.word;
      currentCaption.endTime = word.end;
    } else {
      // Finish current caption and start new one
      currentCaption.endTime = currentCaption.words[currentCaption.words.length - 1].end;
      
      // Ensure minimum display time
      const displayTime = currentCaption.endTime - currentCaption.startTime;
      if (displayTime < minDisplayTime) {
        currentCaption.endTime = currentCaption.startTime + minDisplayTime;
      }
      
      captions.push({ ...currentCaption });
      
      // Start new caption
      currentCaption = {
        words: [word],
        startTime: word.start,
        endTime: word.end,
        text: word.word
      };
    }
  }

  // Add the last caption
  if (currentCaption.words.length > 0) {
    currentCaption.endTime = currentCaption.words[currentCaption.words.length - 1].end;
    
    // Ensure minimum display time
    const displayTime = currentCaption.endTime - currentCaption.startTime;
    if (displayTime < minDisplayTime) {
      currentCaption.endTime = currentCaption.startTime + minDisplayTime;
    }
    
    captions.push(currentCaption);
  }

  const totalDuration = captions.length > 0 ? captions[captions.length - 1].endTime : 0;
  
  console.log(`✅ [CAPTIONS] Generated ${captions.length} caption segments`);
  console.log(`⏱️ [CAPTIONS] Total duration: ${totalDuration.toFixed(1)}s`);
  console.log(`📋 [CAPTIONS] Sample captions:`);
  captions.slice(0, 3).forEach((caption, index) => {
    console.log(`  ${index + 1}. "${caption.text}" [${caption.startTime.toFixed(1)}s - ${caption.endTime.toFixed(1)}s]`);
  });

  return {
    captions,
    totalDuration,
    platform,
    styling: {
      fontSize,
      fontColor,
      outlineColor,
      backgroundColor
    }
  };
}

/**
 * Generate FFmpeg drawtext filters for caption rendering using textfile approach
 * @param {Object} captionData - Caption data from generateCaptionData
 * @param {Object} options - FFmpeg options
 * @returns {Object} - Object containing filters and text files data
 */
export function generateFFmpegCaptionFilters(captionData, options = {}) {
  const {
    videoWidth = 1080,
    videoHeight = 1920,
    position = 'bottom', // 'top', 'center', 'bottom'
    marginBottom = 150,
    marginTop = 150,
    tempDir = '/tmp' // Directory for temporary text files
  } = options;

  if (!captionData.captions || captionData.captions.length === 0) {
    console.log('⚠️ [CAPTIONS] No captions to render');
    return { filters: [], textFiles: [] };
  }

  console.log(`🎥 [CAPTIONS] Generating FFmpeg filters for ${captionData.captions.length} captions using textfile approach`);
  console.log(`📐 [CAPTIONS] Video size: ${videoWidth}x${videoHeight}, Position: ${position}`);

  // Calculate vertical position
  let yPosition;
  switch (position) {
    case 'top':
      yPosition = marginTop;
      break;
    case 'center':
      yPosition = '(h-text_h)/2';
      break;
    case 'bottom':
    default:
      yPosition = `h-text_h-${marginBottom}`;
      break;
  }

  // Platform-specific styling
  const styling = getPlatformStyling(captionData.platform);
  
  console.log(`✅ [CAPTIONS] Using all ${captionData.captions.length} captions via textfile method to avoid escaping issues`);
  
  const filters = [];
  const textFiles = [];
  
  captionData.captions.forEach((caption, index) => {
    // Create temporary text file path for this caption
    const textFilePath = `${tempDir}/caption_${Date.now()}_${index}.txt`;
    
    // Store text file info for creation later
    textFiles.push({
      path: textFilePath,
      content: caption.text.trim() // Clean text without any escaping needed
    });
    
    // Create drawtext filter using textfile instead of text parameter
    const filter = `drawtext=textfile='${textFilePath}':x=(w-text_w)/2:y=${yPosition}:fontsize=${styling.fontSize}:fontcolor=${styling.fontColor}:bordercolor=${styling.outlineColor}:borderw=${styling.outlineWidth}:enable='between(t,${caption.startTime},${caption.endTime})'`;
    
    filters.push(filter);
  });

  console.log(`✅ [CAPTIONS] Generated ${filters.length} FFmpeg drawtext filters using textfile method`);
  console.log(`🎨 [CAPTIONS] Styling: ${JSON.stringify(styling)}`);
  console.log(`📁 [CAPTIONS] Created ${textFiles.length} text files for caption content`);

  return { filters, textFiles };
}

/**
 * Get platform-specific styling configurations
 * @param {string} platform - Platform name
 * @returns {Object} - Styling configuration
 */
function getPlatformStyling(platform) {
  const styles = {
    tiktok: {
      fontSize: 48,
      fontColor: 'white',
      outlineColor: 'black',
      outlineWidth: 3,
      fontFamily: 'Arial Black'
    },
    instagram: {
      fontSize: 44,
      fontColor: 'white',
      outlineColor: 'black',
      outlineWidth: 2,
      fontFamily: 'Arial Bold'
    },
    youtube: {
      fontSize: 40,
      fontColor: 'white',
      outlineColor: 'black',
      outlineWidth: 2,
      fontFamily: 'Arial'
    },
    default: {
      fontSize: 42,
      fontColor: 'white',
      outlineColor: 'black',
      outlineWidth: 2,
      fontFamily: 'Arial'
    }
  };

  return styles[platform] || styles.default;
}

/**
 * Escape text for FFmpeg drawtext filter
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeFFmpegText(text) {
  // FFmpeg drawtext requires specific character escaping
  return text
    .replace(/\\/g, '\\\\')    // Escape backslashes
    .replace(/:/g, '\\:')      // Escape colons
    .replace(/'/g, "\\'")      // Escape single quotes
    .replace(/\[/g, '\\[')     // Escape square brackets
    .replace(/\]/g, '\\]')     // Escape square brackets
    .replace(/,/g, '\\,')      // Escape commas
    .replace(/;/g, '\\;');     // Escape semicolons
}

/**
 * Generate SRT subtitle file content (for external subtitle support)
 * @param {Object} captionData - Caption data from generateCaptionData
 * @returns {string} - SRT file content
 */
export function generateSRTContent(captionData) {
  if (!captionData.captions || captionData.captions.length === 0) {
    return '';
  }

  console.log(`📄 [CAPTIONS] Generating SRT content for ${captionData.captions.length} captions`);

  let srtContent = '';
  
  captionData.captions.forEach((caption, index) => {
    const startTime = formatSRTTimestamp(caption.startTime);
    const endTime = formatSRTTimestamp(caption.endTime);
    
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${caption.text}\n\n`;
  });

  console.log(`✅ [CAPTIONS] Generated SRT content (${srtContent.length} characters)`);
  return srtContent;
}

/**
 * Format timestamp for SRT format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
function formatSRTTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export default {
  generateCaptionData,
  generateFFmpegCaptionFilters,
  generateSRTContent,
  getPlatformStyling,
  escapeFFmpegText
};