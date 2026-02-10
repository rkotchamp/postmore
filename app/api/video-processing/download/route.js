/**
 * Video Download API Route
 * Handles video downloads from URLs using yt-dlp
 *
 * In production: Forwards requests to Railway video processing service
 * In development: Uses local yt-dlp (if available)
 */

import { NextResponse } from 'next/server';
import VideoUtils from '@/app/lib/video-processing/utils/videoUtils';

// Railway video processing service configuration
const RAILWAY_VIDEO_API_URL = process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

/**
 * Check if Railway service is configured
 */
function isRailwayConfigured() {
  return !!(RAILWAY_VIDEO_API_URL && VIDEO_API_SECRET);
}

/**
 * Forward request to Railway video processing service
 */
async function forwardToRailway(endpoint, body) {
  const response = await fetch(`${RAILWAY_VIDEO_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VIDEO_API_SECRET}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Railway service returned ${response.status}`);
  }

  return data;
}

/**
 * Detect platform from URL (local validation)
 */
function detectPlatform(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitch.tv')) return 'twitch';
  if (lowerUrl.includes('kick.com')) return 'kick';
  if (lowerUrl.includes('rumble.com')) return 'rumble';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('vimeo.com')) return 'vimeo';

  return null;
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if platform is supported
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported video platform. Supported platforms: YouTube, Twitch, Kick, Rumble, TikTok, Instagram, Vimeo' },
        { status: 400 }
      );
    }

    // Use Railway service in production
    if (isRailwayConfigured()) {
      console.log('[DOWNLOAD] Forwarding to Railway video service...');

      // First get metadata to validate
      const metadataResult = await forwardToRailway('/metadata', { url });
      const videoInfo = metadataResult.metadata;

      // Validate video constraints
      const constraints = VideoUtils.getPlatformConstraints(options.targetPlatform || 'tiktok');
      const validation = VideoUtils.validateProcessingConstraints(videoInfo, {
        maxDuration: options.maxDuration || constraints.maxDuration * 2,
        maxFileSize: options.maxFileSize || 1073741824 // 1GB default
      });

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Video does not meet processing requirements',
            issues: validation.issues,
            videoInfo: {
              title: videoInfo.title,
              duration: VideoUtils.formatDuration(videoInfo.duration),
              fileSize: VideoUtils.formatFileSize(videoInfo.filesize || 0)
            }
          },
          { status: 400 }
        );
      }

      // Download via Railway
      const downloadResult = await forwardToRailway('/download', {
        url,
        quality: options.quality || 'best[height<=1080]/best',
        uploadToFirebase: true
      });

      return NextResponse.json({
        success: true,
        download: {
          filePath: downloadResult.firebaseUrl || downloadResult.localPath,
          firebaseUrl: downloadResult.firebaseUrl,
          filename: downloadResult.filename
        },
        videoInfo: downloadResult.metadata || videoInfo,
        platform: downloadResult.platform || platform,
        qualityScore: VideoUtils.calculateQualityScore(videoInfo),
        processing: {
          estimatedClips: Math.ceil(videoInfo.duration / 60),
          recommendedPlatforms: [platform],
          canProcess: validation.isValid
        },
        source: 'railway'
      });

    } else {
      // Fallback: Local processing (for development only)
      console.warn('[DOWNLOAD] Railway not configured - attempting local processing');

      // Dynamic import for local development
      const VideoDownloaderService = (await import('@/app/lib/video-processing/services/downloaderService')).default;
      const downloaderService = new VideoDownloaderService();

      // Get video info first
      let videoInfo;
      try {
        videoInfo = await downloaderService.getVideoInfo(url);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to get video information. Make sure yt-dlp is installed or configure RAILWAY_VIDEO_API_URL.',
            details: error.message
          },
          { status: 400 }
        );
      }

      // Validate video constraints
      const constraints = VideoUtils.getPlatformConstraints(options.targetPlatform || 'tiktok');
      const validation = VideoUtils.validateProcessingConstraints(videoInfo, {
        maxDuration: options.maxDuration || constraints.maxDuration * 2,
        maxFileSize: options.maxFileSize || 1073741824
      });

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Video does not meet processing requirements',
            issues: validation.issues,
            videoInfo: {
              title: videoInfo.title,
              duration: VideoUtils.formatDuration(videoInfo.duration),
              fileSize: VideoUtils.formatFileSize(videoInfo.filesize || 0)
            }
          },
          { status: 400 }
        );
      }

      // Download the video locally
      const downloadResult = await downloaderService.downloadVideo(url, {
        quality: options.quality || 'best[height<=1080]/best',
        audioOnly: options.audioOnly || false,
        downloadSubtitles: options.downloadSubtitles || false,
        autoGeneratedSubs: options.autoGeneratedSubs || false,
        outputFormat: options.outputFormat || 'mp4',
        maxFileSize: options.maxFileSize || '1G',
        maxDuration: options.maxDuration || 7200
      });

      return NextResponse.json({
        success: true,
        download: downloadResult,
        videoInfo: videoInfo,
        platform: platform,
        qualityScore: VideoUtils.calculateQualityScore(videoInfo),
        processing: {
          estimatedClips: Math.ceil(videoInfo.duration / 60),
          recommendedPlatforms: [platform],
          canProcess: validation.isValid
        },
        source: 'local'
      });
    }

  } catch (error) {
    console.error('Download error:', error);

    return NextResponse.json(
      {
        error: 'Download failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);

    // Use Railway service if configured
    if (isRailwayConfigured()) {
      const result = await forwardToRailway('/metadata', { url });
      const videoInfo = result.metadata;

      return NextResponse.json({
        success: true,
        videoInfo: videoInfo,
        platform: result.platform || platform,
        qualityScore: VideoUtils.calculateQualityScore(videoInfo),
        constraints: VideoUtils.getPlatformConstraints(platform),
        canDownload: !!platform,
        estimatedFileSize: VideoUtils.formatFileSize(videoInfo.filesize || 0),
        formattedDuration: VideoUtils.formatDuration(videoInfo.duration || 0),
        source: 'railway'
      });

    } else {
      // Fallback: Local processing
      const VideoDownloaderService = (await import('@/app/lib/video-processing/services/downloaderService')).default;
      const downloaderService = new VideoDownloaderService();

      const videoInfo = await downloaderService.getVideoInfo(url);

      return NextResponse.json({
        success: true,
        videoInfo: videoInfo,
        platform: platform,
        qualityScore: VideoUtils.calculateQualityScore(videoInfo),
        constraints: VideoUtils.getPlatformConstraints(platform),
        canDownload: !!platform,
        estimatedFileSize: VideoUtils.formatFileSize(videoInfo.filesize || 0),
        formattedDuration: VideoUtils.formatDuration(videoInfo.duration || 0),
        source: 'local'
      });
    }

  } catch (error) {
    console.error('Video info error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get video information',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Health check
export async function HEAD(request) {
  try {
    if (isRailwayConfigured()) {
      const response = await fetch(`${RAILWAY_VIDEO_API_URL}/health`);
      return new Response(null, { status: response.ok ? 200 : 503 });
    } else {
      // Check local yt-dlp
      const VideoDownloaderService = (await import('@/app/lib/video-processing/services/downloaderService')).default;
      const downloaderService = new VideoDownloaderService();
      const isHealthy = await downloaderService.healthCheck();
      return new Response(null, { status: isHealthy ? 200 : 503 });
    }
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}
