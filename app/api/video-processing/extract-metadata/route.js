import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { uploadClipperThumbnail } from '@/app/lib/storage/firebase';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const metadata = await extractVideoMetadata(url);
    
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
 * Parse duration string to seconds
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  
  // Handle formats like "1:23:45" or "123.45"
  const parts = durationStr.split(':').reverse();
  let seconds = 0;
  
  for (let i = 0; i < parts.length; i++) {
    seconds += parseFloat(parts[i]) * Math.pow(60, i);
  }
  
  return Math.floor(seconds);
}

/**
 * Get thumbnail for live streams or videos without thumbnails
 */
function getLiveThumbnail(metadata, platform, thumbnails) {
  const avatar = thumbnails.find(t => 
    t.id?.includes('avatar') || 
    t.url?.includes('avatar') ||
    t.id?.includes('channel') ||
    t.url?.includes('channel')
  );
  
  if (avatar) {
    return avatar.url;
  }
  
  return null;
}

/**
 * Generate platform-specific live placeholder
 */
function generateLivePlaceholder(platform, metadata) {
  const channelName = metadata.uploader || metadata.channel || 'Unknown';
  
  // Return a data URL for a simple SVG placeholder
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <circle cx="160" cy="70" r="8" fill="#ff0000"/>
      <text x="160" y="95" text-anchor="middle" fill="white" font-family="Arial" font-size="12">
        🔴 LIVE on ${platform.toUpperCase()}
      </text>
      <text x="160" y="115" text-anchor="middle" fill="#cccccc" font-family="Arial" font-size="10">
        ${channelName}
      </text>
      <text x="160" y="135" text-anchor="middle" fill="#999999" font-family="Arial" font-size="9">
        Wait for stream to end for processing
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Store extracted frame in Firebase Storage
 */
async function storeFrameInFirebase(frameBuffer, originalUrl) {
  try {
    const timestamp = Date.now();
    const urlHash = Buffer.from(originalUrl).toString('base64').slice(0, 16);
    const fileName = `extracted_frame_${urlHash}_${timestamp}.jpg`;
    
    const blob = new Blob([frameBuffer], { type: 'image/jpeg' });
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    
    const result = await uploadClipperThumbnail(file, `frame_${timestamp}`);
    
    return result.url;
    
  } catch (error) {
    throw error;
  }
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