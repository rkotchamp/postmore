/**
 * Timestamp Parser Utility
 * Handles timestamp formatting and parsing for video cutting operations
 */

/**
 * Convert seconds to FFmpeg time format (HH:MM:SS.mmm)
 */
export const secondsToFFmpegTime = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) {
    throw new Error('Invalid seconds value');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
};

/**
 * Convert FFmpeg time format to seconds
 */
export const ffmpegTimeToSeconds = (timeString) => {
  if (typeof timeString !== 'string') {
    throw new Error('Invalid time string');
  }

  const parts = timeString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid time format. Expected HH:MM:SS.mmm');
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid time values');
  }

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Format duration for display (e.g., "1m 30s", "45s")
 */
export const formatDurationForDisplay = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) {
    return '0s';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  return `${remainingSeconds}s`;
};

/**
 * Validate timestamp range for video cutting
 */
export const validateTimestampRange = (startTime, endTime, videoDuration = null) => {
  const errors = [];

  // Basic validation
  if (typeof startTime !== 'number' || startTime < 0) {
    errors.push('Start time must be a positive number');
  }

  if (typeof endTime !== 'number' || endTime < 0) {
    errors.push('End time must be a positive number');
  }

  if (startTime >= endTime) {
    errors.push('Start time must be less than end time');
  }

  // Duration validation
  const duration = endTime - startTime;
  if (duration < 1) {
    errors.push('Clip duration must be at least 1 second');
  }

  if (duration > 300) { // 5 minutes max
    errors.push('Clip duration cannot exceed 5 minutes');
  }

  // Video duration validation
  if (videoDuration && typeof videoDuration === 'number') {
    if (startTime >= videoDuration) {
      errors.push('Start time cannot exceed video duration');
    }

    if (endTime > videoDuration) {
      errors.push('End time cannot exceed video duration');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    duration: endTime - startTime
  };
};

/**
 * Generate FFmpeg cut parameters for a clip
 */
export const generateCutParameters = (startTime, endTime, options = {}) => {
  const validation = validateTimestampRange(startTime, endTime);
  
  if (!validation.isValid) {
    throw new Error(`Invalid timestamp range: ${validation.errors.join(', ')}`);
  }

  const {
    seekAccuracy = 'fast', // 'fast' or 'precise'
    audioCodec = 'aac',
    videoCodec = 'libx264',
    format = 'mp4'
  } = options;

  const ffmpegStart = secondsToFFmpegTime(startTime);
  const duration = endTime - startTime;
  const ffmpegDuration = secondsToFFmpegTime(duration);

  const parameters = {
    startTime: ffmpegStart,
    duration: ffmpegDuration,
    audioCodec,
    videoCodec,
    format
  };

  // Add seek accuracy settings
  if (seekAccuracy === 'precise') {
    parameters.inputSeek = false; // Seek after input (slower but more accurate)
  } else {
    parameters.inputSeek = true; // Seek before input (faster but less accurate)
  }

  return parameters;
};

/**
 * Parse subtitle timestamp format (SRT format: HH:MM:SS,mmm)
 */
export const parseSRTTimestamp = (srtTime) => {
  if (typeof srtTime !== 'string') {
    throw new Error('Invalid SRT timestamp');
  }

  // Replace comma with dot for milliseconds
  const normalizedTime = srtTime.replace(',', '.');
  
  try {
    return ffmpegTimeToSeconds(normalizedTime);
  } catch (error) {
    throw new Error(`Invalid SRT timestamp format: ${srtTime}`);
  }
};

/**
 * Convert seconds to SRT timestamp format
 */
export const secondsToSRTTime = (seconds) => {
  const ffmpegTime = secondsToFFmpegTime(seconds);
  // Replace dot with comma for SRT format
  return ffmpegTime.replace('.', ',');
};

/**
 * Calculate optimal cut points based on segment boundaries
 */
export const findOptimalCutPoints = (targetStart, targetEnd, segments, tolerance = 2.0) => {
  let optimalStart = targetStart;
  let optimalEnd = targetEnd;

  // Find segment boundaries near target times
  for (const segment of segments) {
    // Check for better start point
    if (Math.abs(segment.start - targetStart) <= tolerance) {
      // Prefer segment starts that begin with capital letters (sentence start)
      if (segment.text.match(/^\s*[A-Z]/)) {
        optimalStart = segment.start;
      }
    }

    // Check for better end point
    if (Math.abs(segment.end - targetEnd) <= tolerance) {
      // Prefer segment ends that end with punctuation
      if (segment.text.match(/[.!?]\s*$/)) {
        optimalEnd = segment.end;
      }
    }
  }

  return {
    originalStart: targetStart,
    originalEnd: targetEnd,
    optimizedStart: optimalStart,
    optimizedEnd: optimalEnd,
    startAdjustment: optimalStart - targetStart,
    endAdjustment: optimalEnd - targetEnd,
    duration: optimalEnd - optimalStart
  };
};

/**
 * Batch validate multiple clips
 */
export const validateClipBatch = (clips, videoDuration = null) => {
  const results = [];
  
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const validation = validateTimestampRange(
      clip.startTime, 
      clip.endTime, 
      videoDuration
    );
    
    results.push({
      clipIndex: i,
      clipId: clip.id || `clip_${i + 1}`,
      ...validation
    });
  }

  const validClips = results.filter(r => r.isValid);
  const invalidClips = results.filter(r => !r.isValid);

  return {
    totalClips: clips.length,
    validClips: validClips.length,
    invalidClips: invalidClips.length,
    results,
    allValid: invalidClips.length === 0
  };
};

/**
 * Generate timeline visualization data for clips
 */
export const generateTimelineData = (clips, videoDuration) => {
  if (!videoDuration || videoDuration <= 0) {
    throw new Error('Valid video duration required for timeline generation');
  }

  const timeline = clips.map((clip, index) => {
    const startPercent = (clip.startTime / videoDuration) * 100;
    const endPercent = (clip.endTime / videoDuration) * 100;
    const widthPercent = endPercent - startPercent;

    return {
      clipId: clip.id || `clip_${index + 1}`,
      startTime: clip.startTime,
      endTime: clip.endTime,
      duration: clip.endTime - clip.startTime,
      startPercent: Math.max(0, Math.min(100, startPercent)),
      widthPercent: Math.max(0, Math.min(100 - startPercent, widthPercent)),
      rank: clip.rank || index + 1,
      engagementScore: clip.engagementScore || 0
    };
  });

  // Sort by start time for timeline display
  timeline.sort((a, b) => a.startTime - b.startTime);

  return {
    videoDuration,
    totalClips: clips.length,
    timeline
  };
};

/**
 * Check for overlapping clips and suggest adjustments
 */
export const detectClipOverlaps = (clips) => {
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
  const overlaps = [];

  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    if (currentClip.endTime > nextClip.startTime) {
      const overlapDuration = currentClip.endTime - nextClip.startTime;
      
      overlaps.push({
        clip1: {
          id: currentClip.id,
          startTime: currentClip.startTime,
          endTime: currentClip.endTime
        },
        clip2: {
          id: nextClip.id,
          startTime: nextClip.startTime,
          endTime: nextClip.endTime
        },
        overlapDuration,
        suggestedFix: {
          adjustClip1EndTo: nextClip.startTime - 0.1,
          adjustClip2StartTo: currentClip.endTime + 0.1
        }
      });
    }
  }

  return {
    hasOverlaps: overlaps.length > 0,
    overlapCount: overlaps.length,
    overlaps
  };
};