import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { uploadClipperThumbnail } from '@/app/lib/storage/firebase';

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
 * Call Railway video processing API
 */
async function callRailwayAPI(endpoint, body) {
  const url = `${RAILWAY_VIDEO_API_URL}${endpoint}`;
  console.log(`🚂 [RAILWAY] Calling ${url}...`);

  const response = await fetch(url, {
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

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let metadata;

    // Use Railway service in production
    if (isRailwayConfigured()) {
      console.log('🚂 [METADATA] Using Railway video processing service...');

      const result = await callRailwayAPI('/metadata', { url });
      const railwayMetadata = result.metadata;

      // Format response to match expected structure
      metadata = {
        title: railwayMetadata.title || 'Unknown Title',
        description: railwayMetadata.description || '',
        duration: railwayMetadata.duration || 0,
        thumbnail: railwayMetadata.thumbnail || null,
        uploader: railwayMetadata.uploader || 'Unknown',
        upload_date: railwayMetadata.uploadDate,
        view_count: railwayMetadata.viewCount,
        like_count: railwayMetadata.likeCount,
        width: railwayMetadata.width,
        height: railwayMetadata.height,
        fps: railwayMetadata.fps,
        url: railwayMetadata.originalUrl || url,
        id: railwayMetadata.id,
        platform: railwayMetadata.platform || detectPlatform(url),
        is_live: false
      };

    } else {
      // Fallback: Local processing (for development)
      console.log('💻 [METADATA] Using local yt-dlp...');
      metadata = await extractVideoMetadata(url);
    }

    return NextResponse.json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('Metadata extraction failed:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function extractVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const platform = detectPlatform(url);
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--extractor-retries', '5',
      '--socket-timeout', '45',
    ];

    if (platform === 'rumble') {
      args.push('--ignore-errors');
      args.push('--no-check-certificate');
    } else {
      args.push('--write-thumbnail');
      args.push('--skip-download');
    }

    args.push(url);

    const ytdlp = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const metadata = JSON.parse(stdout.trim());
        const thumbnail = await getBestThumbnailWithFrames(metadata, url);

        const result = {
          title: metadata.title || 'Unknown Title',
          description: metadata.description || '',
          duration: metadata.duration || 0,
          thumbnail: thumbnail,
          thumbnails: metadata.thumbnails || [],
          uploader: metadata.uploader || metadata.channel || metadata.uploader_id || 'Unknown',
          upload_date: metadata.upload_date,
          view_count: metadata.view_count,
          like_count: metadata.like_count,
          width: metadata.width,
          height: metadata.height,
          fps: metadata.fps,
          format: metadata.ext,
          url: metadata.webpage_url || url,
          id: metadata.id,
          platform: detectPlatform(url),
          is_live: metadata.is_live || metadata.live_status === 'is_live' || false
        };

        resolve(result);

      } catch (parseError) {
        reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`yt-dlp process failed: ${error.message}`));
    });
  });
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitch.tv')) return 'twitch';
  if (url.includes('kick.com')) return 'kick';
  if (url.includes('rumble.com')) return 'rumble';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'other';
}

/**
 * Get the best quality thumbnail for each platform
 */
function getBestThumbnail(metadata, url) {
  const platform = detectPlatform(url);
  const thumbnails = metadata.thumbnails || [];

  if (thumbnails.length === 0) {
    return metadata.thumbnail;
  }

  switch (platform) {
    case 'youtube':
      const ytPreferred = thumbnails.find(t =>
        t.id === 'maxresdefault' || t.url?.includes('maxresdefault')
      ) || thumbnails.find(t =>
        t.id === 'hqdefault' || t.url?.includes('hqdefault')
      );
      if (ytPreferred) return ytPreferred.url;
      break;

    case 'twitch':
      const twitchSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (twitchSorted.length > 0) {
        return twitchSorted[0].url;
      }
      break;

    case 'kick':
      const kickSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (kickSorted.length > 0) {
        return kickSorted[0].url;
      }
      break;

    case 'rumble':
      const rumbleStrategies = [
        () => thumbnails
          .filter(t => t.url && t.width && t.height && t.width >= 480)
          .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0],
        () => thumbnails.find(t => t.url && t.width && t.height),
        () => thumbnails.find(t => t.url),
        () => metadata.thumbnail ? { url: metadata.thumbnail } : null
      ];

      for (const strategy of rumbleStrategies) {
        const result = strategy();
        if (result?.url) {
          return result.url;
        }
      }
      break;

    default:
      const genericSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (genericSorted.length > 0) {
        return genericSorted[0].url;
      }
  }

  const fallback = thumbnails.find(t => t.url);
  if (fallback) {
    return fallback.url;
  }

  return metadata.thumbnail;
}

/**
 * Extract actual video frame using ffmpeg through yt-dlp
 */
async function extractVideoFrame(url) {
  return new Promise((resolve, reject) => {
    const outputPath = `/tmp/thumbnail_${Date.now()}.jpg`;
    const platform = detectPlatform(url);

    const args = ['--no-download', '--get-url'];

    if (platform === 'rumble') {
      args.push('--format', 'best[height<=480]/best');
      args.push('--ignore-errors');
      args.push('--no-check-certificate');
      args.push('--extractor-retries', '3');
    } else {
      args.push('--format', 'best[height<=720]');
    }

    args.push(url);

    const process = spawn('yt-dlp', args);
    let videoUrl = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      videoUrl += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0 && videoUrl.trim()) {
        const directVideoUrl = videoUrl.trim().split('\n')[0];

        extractFrameWithFFmpeg(directVideoUrl, outputPath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`Failed to get video URL: ${stderr || 'No output'}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`yt-dlp process failed: ${error.message}`));
    });
  });
}

/**
 * Extract frame using ffmpeg directly
 */
function extractFrameWithFFmpeg(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', videoUrl,
      '-vf', 'select=gte(n\\,1)',
      '-vframes', '1',
      '-f', 'image2',
      '-q:v', '2',
      '-y',
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        try {
          const fs = require('fs');
          const frameBuffer = fs.readFileSync(outputPath);
          const base64Frame = frameBuffer.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64Frame}`;

          fs.unlinkSync(outputPath);

          resolve(dataUrl);
        } catch (fileError) {
          reject(new Error(`File processing failed: ${fileError.message}`));
        }
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process failed: ${error.message}`));
    });
  });
}

/**
 * Enhanced thumbnail extraction with frame fallback
 */
async function getBestThumbnailWithFrames(metadata, url) {
  const platform = detectPlatform(url);
  const thumbnail = getBestThumbnail(metadata, url);

  const preferFrameExtraction = ['twitch', 'kick', 'rumble'].includes(platform);

  const isLive = metadata.is_live || metadata.live_status === 'is_live';
  if (isLive) {
    return thumbnail;
  }

  if (preferFrameExtraction || !thumbnail || thumbnail.includes('placeholder') || thumbnail.includes('data:image/svg')) {
    try {
      const frameUrl = await extractVideoFrame(url);

      if (frameUrl) {
        return frameUrl;
      }
    } catch (error) {
      // Fall back to original thumbnail
    }
  }

  return thumbnail;
}
