st;
/**
 * Clip Detection Service
 * Analyzes video transcripts and identifies optimal clip segments
 * Uses simple algorithms to detect engaging moments
 */

const CONFIG = {
  minClipDuration: 15, // seconds
  maxClipDuration: 90, // seconds
  targetClipDuration: 30, // seconds
};

/**
 * Analyze transcript and detect optimal clips
 */
export const detectClips = async (transcriptionData, options = {}) => {
  try {
    const {
      platform = "tiktok",
      contentType = "general",
      targetClipCount = 5,
      minEngagementScore = 0.6,
    } = options;

    // Extract segments from transcription
    const segments = extractSegments(transcriptionData);

    // Group segments into potential clips
    const potentialClips = groupSegmentsIntoClips(segments);

    // Score clips for engagement
    const scoredClips = scoreClips(potentialClips, platform);

    // Rank and filter clips
    const rankedClips = rankClipsByScore(scoredClips, minEngagementScore);

    // Optimize clip boundaries
    const optimizedClips = optimizeClipBoundaries(rankedClips, segments);

    return formatClipResults(optimizedClips, platform);
  } catch (error) {
    console.error("Clip detection failed:", error);
    throw new Error(`Clip detection failed: ${error.message}`);
  }
};

/**
 * Extract meaningful segments from transcription data
 */
const extractSegments = (transcriptionData) => {
  const segments = [];

  if (transcriptionData.segments) {
    // Format from Whisper API
    transcriptionData.segments.forEach((segment) => {
      segments.push({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
        confidence: segment.confidence || 0.9,
      });
    });
  } else if (transcriptionData.words) {
    // Alternative format with word-level timestamps
    let currentSegment = null;

    transcriptionData.words.forEach((word) => {
      if (!currentSegment || word.start - currentSegment.end > 2.0) {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = {
          start: word.start,
          end: word.end,
          text: word.word,
          confidence: word.confidence || 0.9,
        };
      } else {
        currentSegment.end = word.end;
        currentSegment.text += " " + word.word;
      }
    });

    if (currentSegment) segments.push(currentSegment);
  } else {
    throw new Error("Invalid transcription format - missing segments or words");
  }

  return segments.filter((seg) => seg.text.length > 10);
};

/**
 * Group segments into potential clips based on duration and content flow
 */
const groupSegmentsIntoClips = (segments) => {
  const clips = [];
  let currentClip = null;

  for (const segment of segments) {
    if (!currentClip) {
      currentClip = {
        start: segment.start,
        end: segment.end,
        segments: [segment],
        text: segment.text,
        duration: segment.end - segment.start,
      };
    } else {
      const potentialEnd = segment.end;
      const potentialDuration = potentialEnd - currentClip.start;

      // Check if adding this segment exceeds max duration
      if (potentialDuration > CONFIG.maxClipDuration) {
        clips.push(currentClip);
        currentClip = {
          start: segment.start,
          end: segment.end,
          segments: [segment],
          text: segment.text,
          duration: segment.end - segment.start,
        };
      } else {
        // Add segment to current clip
        currentClip.end = segment.end;
        currentClip.segments.push(segment);
        currentClip.text += " " + segment.text;
        currentClip.duration = potentialDuration;
      }
    }
  }

  if (currentClip) clips.push(currentClip);

  // Filter clips by minimum duration
  return clips.filter((clip) => clip.duration >= CONFIG.minClipDuration);
};

/**
 * Score clips for engagement using simple algorithms
 */
const scoreClips = (clips, platform) => {
  return clips.map((clip) => {
    const text = clip.text.toLowerCase();
    let score = 0.3; // Base score
    const engagementFactors = [];

    // Check for engaging elements
    if (text.includes("?")) {
      score += 0.15;
      engagementFactors.push("question");
    }

    if (text.includes("!")) {
      score += 0.1;
      engagementFactors.push("excitement");
    }

    if (/\b(you|your)\b/.test(text)) {
      score += 0.1;
      engagementFactors.push("direct-address");
    }

    if (/\b(amazing|incredible|unbelievable|shocking|wow)\b/.test(text)) {
      score += 0.15;
      engagementFactors.push("emotional-impact");
    }

    if (/\b(how to|learn|tip|secret|trick)\b/.test(text)) {
      score += 0.1;
      engagementFactors.push("educational");
    }

    if (/\b(number|first|second|step|rule)\b/.test(text)) {
      score += 0.1;
      engagementFactors.push("structured-content");
    }

    // Duration scoring
    if (clip.duration >= 20 && clip.duration <= 45) {
      score += 0.1;
      engagementFactors.push("optimal-duration");
    }

    // Word count scoring
    const wordCount = text.split(" ").length;
    if (wordCount >= 15 && wordCount <= 60) {
      score += 0.1;
      engagementFactors.push("good-length");
    }

    return {
      ...clip,
      engagementScore: Math.min(score, 1.0),
      engagementFactors,
      wordCount,
    };
  });
};

/**
 * Rank clips by engagement score
 */
const rankClipsByScore = (clips, minScore) => {
  return clips
    .filter((clip) => clip.engagementScore >= minScore)
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .map((clip, index) => ({
      ...clip,
      rank: index + 1,
    }));
};

/**
 * Optimize clip boundaries for better content
 */
const optimizeClipBoundaries = (clips, segments) => {
  return clips.map((clip) => {
    // Find optimal start/end points
    const optimizedStart = findOptimalStart(clip, segments);
    const optimizedEnd = findOptimalEnd(clip, segments);

    return {
      ...clip,
      originalStart: clip.start,
      originalEnd: clip.end,
      start: optimizedStart,
      end: optimizedEnd,
      duration: optimizedEnd - optimizedStart,
    };
  });
};

/**
 * Find optimal start point for clip
 */
const findOptimalStart = (clip, segments) => {
  // Look for sentence boundaries near the start
  const startSegment = segments.find(
    (seg) => Math.abs(seg.start - clip.start) < 2.0
  );

  if (startSegment && startSegment.text.match(/^[A-Z]/)) {
    return startSegment.start;
  }

  return clip.start;
};

/**
 * Find optimal end point for clip
 */
const findOptimalEnd = (clip, segments) => {
  // Look for sentence boundaries near the end
  const endSegment = segments.find(
    (seg) => Math.abs(seg.end - clip.end) < 2.0 && seg.text.match(/[.!?]$/)
  );

  if (endSegment) {
    return endSegment.end;
  }

  return clip.end;
};

/**
 * Format final clip results
 */
const formatClipResults = (clips, platform) => {
  return clips.map((clip, index) => ({
    id: `clip_${index + 1}`,
    rank: clip.rank,
    startTime: clip.start,
    endTime: clip.end,
    duration: clip.duration,
    text: clip.text,
    engagementScore: clip.engagementScore,
    engagementFactors: clip.engagementFactors,
    wordCount: clip.wordCount,
    platform: platform,
    suggestedTitle: generateClipTitle(clip.text, platform),
    hashtags: generateHashtags(clip.text, platform),
    confidence: calculateConfidence(clip),
  }));
};

/**
 * Generate suggested title for clip
 */
const generateClipTitle = (text, platform) => {
  const firstSentence = text.split(/[.!?]/)[0].trim();
  const maxLength = platform === "youtube" ? 60 : 40;

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  return firstSentence.substring(0, maxLength - 3) + "...";
};

/**
 * Generate relevant hashtags
 */
const generateHashtags = (text, platform) => {
  const commonHashtags = {
    tiktok: ["#fyp", "#viral", "#trending"],
    instagram: ["#reels", "#explore", "#viral"],
    youtube: ["#shorts", "#trending"],
    twitter: ["#viral", "#trending"],
  };

  return commonHashtags[platform] || ["#content"];
};

/**
 * Calculate confidence score for clip
 */
const calculateConfidence = (clip) => {
  let confidence = 0.5; // Base confidence

  // Boost confidence based on various factors
  if (clip.engagementScore > 0.7) confidence += 0.2;
  if (clip.duration >= 20 && clip.duration <= 45) confidence += 0.1;
  if (clip.engagementFactors.length > 2) confidence += 0.1;
  if (clip.wordCount >= 15 && clip.wordCount <= 50) confidence += 0.1;

  return Math.min(confidence, 1.0);
};

/**
 * Get service health status
 */
export const getHealthStatus = async () => {
  return {
    service: "ClipDetectionService",
    status: "healthy",
    capabilities: [
      "Segment Processing",
      "Clip Optimization",
      "Engagement Scoring",
      "Content Analysis",
    ],
    message: "Ready for clip detection",
  };
};
