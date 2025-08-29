/**
 * WebVTT Service
 * Converts transcription segments to WebVTT format for HTML5 video players
 * Enables dynamic subtitle overlay without burning captions into videos
 */

/**
 * Convert seconds to WebVTT timestamp format (HH:MM:SS.mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
function formatWebVttTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Escape WebVTT special characters in caption text
 * @param {string} text - Raw caption text
 * @returns {string} - Escaped text safe for WebVTT
 */
function escapeWebVttText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/-->/g, '--&gt;') // Escape WebVTT timestamp separator
    .trim();
}

/**
 * Generate WebVTT content from transcription segments
 * @param {Array} segments - Transcription segments with start, end, text
 * @param {Object} options - Generation options
 * @returns {string} - Complete WebVTT file content
 */
export function generateWebVTT(segments, options = {}) {
  const {
    title = 'Generated Captions',
    language = 'en',
    maxLineLength = 40,
    maxDuration = 5.0 // Maximum caption display time in seconds
  } = options;

  console.log(`🎬 [WEBVTT] Generating WebVTT for ${segments.length} segments`);

  // WebVTT header
  let webvtt = 'WEBVTT\n';
  webvtt += `NOTE ${title}\n\n`;

  segments.forEach((segment, index) => {
    const startTime = formatWebVttTimestamp(segment.start);
    const endTime = formatWebVttTimestamp(segment.end);
    const text = escapeWebVttText(segment.text);

    // Split long text into multiple lines for better readability
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);

    // Create cue with optional identifier
    webvtt += `${index + 1}\n`;
    webvtt += `${startTime} --> ${endTime}\n`;
    webvtt += `${lines.join('\n')}\n\n`;
  });

  console.log(`✅ [WEBVTT] Generated WebVTT with ${segments.length} cues`);
  return webvtt;
}

/**
 * Generate WebVTT for a specific clip from project transcription
 * @param {Object} clipData - Clip data with startTime, endTime, projectId
 * @param {Object} projectTranscription - Full project transcription
 * @returns {string} - WebVTT content for this clip
 */
export function generateClipWebVTT(clipData, projectTranscription) {
  console.log(`🎬 [WEBVTT] Generating clip WebVTT for ${clipData.startTime}s - ${clipData.endTime}s`);

  if (!projectTranscription || !projectTranscription.segments) {
    console.log(`⚠️ [WEBVTT] No transcription segments found`);
    return 'WEBVTT\n\nNOTE No captions available\n\n';
  }

  // Filter segments that fall within clip timespan
  const clipSegments = projectTranscription.segments.filter(segment =>
    segment.start >= clipData.startTime && segment.end <= clipData.endTime
  );

  if (clipSegments.length === 0) {
    console.log(`⚠️ [WEBVTT] No segments found for clip timespan`);
    return 'WEBVTT\n\nNOTE No captions available for this clip\n\n';
  }

  // Adjust timestamps relative to clip start (0-duration)
  const adjustedSegments = clipSegments.map(segment => ({
    start: segment.start - clipData.startTime,
    end: segment.end - clipData.startTime,
    text: segment.text
  }));

  return generateWebVTT(adjustedSegments, {
    title: `Clip ${clipData.startTime}s-${clipData.endTime}s`,
    language: projectTranscription.language || 'en'
  });
}

/**
 * Get WebVTT MIME type for HTTP responses
 * @returns {string} - MIME type
 */
export function getWebVttMimeType() {
  return 'text/vtt';
}

/**
 * Validate WebVTT content structure
 * @param {string} webvttContent - WebVTT content to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export function validateWebVTT(webvttContent) {
  const errors = [];
  
  if (!webvttContent.startsWith('WEBVTT')) {
    errors.push('Missing WEBVTT header');
  }

  // Basic timestamp validation
  const timestampRegex = /\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}/g;
  const timestamps = webvttContent.match(timestampRegex);
  
  if (!timestamps || timestamps.length === 0) {
    errors.push('No valid timestamp cues found');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cueCount: timestamps ? timestamps.length : 0
  };
}

export default {
  generateWebVTT,
  generateClipWebVTT,
  getWebVttMimeType,
  validateWebVTT,
  formatWebVttTimestamp,
  escapeWebVttText
};