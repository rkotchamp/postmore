/**
 * Video Processing Configuration
 * Central configuration for all video processing services
 */

const path = require('path');

const VideoProcessingConfig = {
  // Hugging Face Whisper Configuration
  whisper: {
    apiUrl: process.env.HUGGINGFACE_WHISPER_API_URL,
    apiToken: process.env.HUGGINGFACE_API_TOKEN,
    defaultOptions: {
      includeTimestamps: true,
      language: 'auto',
      returnSegments: true
    },
    timeout: 300000, // 5 minutes
    maxRetries: 3
  },

  // FFmpeg Configuration
  ffmpeg: {
    binaryPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
    timeout: 600000, // 10 minutes
    defaultVideoCodec: 'libx264',
    defaultAudioCodec: 'aac',
    defaultQuality: {
      videoBitrate: '1000k',
      audioBitrate: '128k',
      crf: 23 // Constant Rate Factor for quality
    }
  },

  // yt-dlp Configuration
  downloader: {
    binaryPath: process.env.YTDLP_PATH || 'yt-dlp',
    downloadDir: process.env.VIDEO_DOWNLOAD_DIR || path.join(process.cwd(), 'temp', 'downloads'),
    timeout: 900000, // 15 minutes
    defaultQuality: 'best[height<=1080]/best',
    supportedPlatforms: [
      'youtube.com',
      'youtu.be',
      'twitch.tv',
      'kick.com',
      'rumble.com',
      'vimeo.com'
    ],
    maxFileSize: '500M', // Maximum download file size
    maxDuration: 7200 // Maximum duration in seconds (2 hours)
  },

  // OpenCV Configuration
  faceDetection: {
    enabled: true, // Will be set to false if OpenCV is not available
    confidence: 0.5,
    minFaceSize: 30,
    scaleFactor: 1.1,
    minNeighbors: 3,
    faceBuffer: 50 // Pixels around detected faces for cropping
  },

  // Subtitle Configuration
  subtitles: {
    defaultFormat: 'srt',
    maxCharsPerLine: 40,
    maxLinesPerSubtitle: 2,
    defaultStyle: {
      fontSize: 24,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      position: 'bottom'
    }
  },

  // Platform Specifications
  platforms: {
    tiktok: {
      name: 'TikTok',
      aspectRatio: '9:16',
      dimensions: { width: 720, height: 1280 },
      maxDuration: 180, // 3 minutes
      minDuration: 3,
      maxFileSize: 287762944, // 274.5 MB
      videoBitrate: '1000k',
      audioBitrate: '128k',
      videoCodec: 'libx264',
      audioCodec: 'aac'
    },
    instagram: {
      name: 'Instagram Reels',
      aspectRatio: '9:16',
      dimensions: { width: 720, height: 1280 },
      maxDuration: 90, // 1.5 minutes
      minDuration: 3,
      maxFileSize: 104857600, // 100 MB
      videoBitrate: '1000k',
      audioBitrate: '128k',
      videoCodec: 'libx264',
      audioCodec: 'aac'
    },
    youtube: {
      name: 'YouTube Shorts',
      aspectRatio: '9:16',
      dimensions: { width: 720, height: 1280 },
      maxDuration: 60, // 1 minute
      minDuration: 3,
      maxFileSize: 2147483648, // 2 GB
      videoBitrate: '1500k',
      audioBitrate: '128k',
      videoCodec: 'libx264',
      audioCodec: 'aac'
    },
    twitter: {
      name: 'Twitter/X',
      aspectRatio: '16:9', // Twitter supports multiple ratios
      dimensions: { width: 1280, height: 720 },
      maxDuration: 140, // 2 minutes 20 seconds
      minDuration: 1,
      maxFileSize: 536870912, // 512 MB
      videoBitrate: '1000k',
      audioBitrate: '128k',
      videoCodec: 'libx264',
      audioCodec: 'aac'
    }
  },

  // File Processing Configuration
  files: {
    tempDir: process.env.VIDEO_PROCESSING_TEMP_DIR || path.join(process.cwd(), 'temp', 'processing'),
    cleanupAfter: 3600000, // 1 hour in milliseconds
    maxConcurrentJobs: 3,
    supportedFormats: {
      video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'],
      audio: ['.mp3', '.wav', '.aac', '.m4a', '.ogg'],
      subtitle: ['.srt', '.vtt', '.ass']
    }
  },

  // Processing Limits
  limits: {
    maxVideoSize: 1073741824, // 1 GB
    maxVideoDuration: 3600, // 1 hour
    maxConcurrentTranscriptions: 2,
    maxConcurrentDownloads: 3,
    maxConcurrentProcessing: 2
  },

  // Error Handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    timeouts: {
      transcription: 300000, // 5 minutes
      download: 900000, // 15 minutes
      processing: 600000, // 10 minutes
      faceDetection: 60000 // 1 minute
    }
  },

  // Quality Settings
  quality: {
    thumbnail: {
      width: 320,
      height: 240,
      format: 'jpg',
      quality: 80
    },
    preview: {
      width: 640,
      height: 480,
      format: 'mp4',
      bitrate: '500k'
    },
    processing: {
      intermediateFormat: 'mp4',
      workingBitrate: '2000k',
      workingResolution: '1280x720'
    }
  },

  // Clip Detection Settings
  clipDetection: {
    minClipDuration: 15, // Minimum clip length in seconds
    maxClipDuration: 180, // Maximum clip length in seconds
    defaultClipDuration: 60, // Default target clip length
    overlapTolerance: 5, // Seconds of overlap allowed between clips
    confidenceThreshold: 0.7, // Minimum confidence for GPT clip suggestions
    maxClipsPerVideo: 10 // Maximum number of clips to generate per video
  },

  // Storage Configuration
  storage: {
    provider: 'firebase', // firebase, s3, local
    retentionPeriod: 604800000, // 1 week in milliseconds
    autoCleanup: true,
    compressionLevel: 6 // 0-9, 0 = no compression, 9 = maximum compression
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'HUGGINGFACE_WHISPER_API_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Helper functions
VideoProcessingConfig.getPlatformConfig = (platform) => {
  return VideoProcessingConfig.platforms[platform] || VideoProcessingConfig.platforms.tiktok;
};

VideoProcessingConfig.isFormatSupported = (filename, type = 'video') => {
  const ext = path.extname(filename).toLowerCase();
  return VideoProcessingConfig.files.supportedFormats[type]?.includes(ext) || false;
};

VideoProcessingConfig.getTempPath = (filename) => {
  return path.join(VideoProcessingConfig.files.tempDir, filename);
};

VideoProcessingConfig.getMaxFileSize = (platform) => {
  const platformConfig = VideoProcessingConfig.getPlatformConfig(platform);
  return Math.min(platformConfig.maxFileSize, VideoProcessingConfig.limits.maxVideoSize);
};

module.exports = VideoProcessingConfig;