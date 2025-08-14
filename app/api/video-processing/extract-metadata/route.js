import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { uploadClipperThumbnail } from '@/app/lib/storage/firebase';

export async function POST(request) {
  console.log('🔍 [METADATA] Starting video metadata extraction...');
  
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    console.log(`📹 [METADATA] Extracting from: ${url}`);
    
    // Use yt-dlp to extract metadata and thumbnail
    const metadata = await extractVideoMetadata(url);
    
    console.log('✅ [METADATA] Extraction completed successfully');
    console.log(`📊 [METADATA] Title: ${metadata.title}`);
    console.log(`🖼️ [METADATA] Thumbnail: ${metadata.thumbnail ? 'Found' : 'Not found'}`);
    console.log(`⏱️ [METADATA] Duration: ${metadata.duration}s`);
    
    return NextResponse.json({
      success: true,
      metadata
    });
    
  } catch (error) {
    console.error('❌ [METADATA] Extraction failed:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function extractVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    console.log('🚀 [YT-DLP] Starting yt-dlp extraction...');
    
    // yt-dlp command to extract metadata and thumbnail info
    const args = [
      '--dump-json',        // Output metadata as JSON
      '--no-download',      // Don't download the video
      '--no-warnings',      // Suppress warnings
      '--write-thumbnail',  // Extract thumbnail info
      '--skip-download',    // Skip actual video download
      '--extractor-retries', '3',  // Retry failed extractions
      '--socket-timeout', '30',    // 30 second timeout
      url
    ];
    
    console.log(`💻 [YT-DLP] Command: yt-dlp ${args.join(' ')}`);
    
    const ytdlp = spawn('yt-dlp', args);
    
    let stdout = '';
    let stderr = '';
    
    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`📝 [YT-DLP] Info: ${data.toString().trim()}`);
    });
    
    ytdlp.on('close', async (code) => {
      console.log(`🏁 [YT-DLP] Process exited with code: ${code}`);
      
      if (code !== 0) {
        console.error(`❌ [YT-DLP] Error output: ${stderr}`);
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        // Parse the JSON output
        const metadata = JSON.parse(stdout.trim());
        
        // Extract relevant information with async thumbnail processing
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
        
        console.log(`✨ [YT-DLP] Successfully extracted metadata for: ${result.title}`);
        resolve(result);
        
      } catch (parseError) {
        console.error('❌ [YT-DLP] JSON parsing failed:', parseError.message);
        console.error('📄 [YT-DLP] Raw output:', stdout);
        reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
      }
    });
    
    ytdlp.on('error', (error) => {
      console.error('❌ [YT-DLP] Process error:', error.message);
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
  
  console.log(`🖼️ [THUMBNAIL] Processing ${thumbnails.length} thumbnails for ${platform}`);
  
  // If no thumbnails array, return the main thumbnail field
  if (thumbnails.length === 0) {
    return metadata.thumbnail;
  }
  
  // Platform-specific thumbnail selection
  switch (platform) {
    case 'youtube':
      // YouTube: prefer maxresdefault, then hqdefault
      const ytPreferred = thumbnails.find(t => 
        t.id === 'maxresdefault' || t.url?.includes('maxresdefault')
      ) || thumbnails.find(t => 
        t.id === 'hqdefault' || t.url?.includes('hqdefault')
      );
      if (ytPreferred) return ytPreferred.url;
      break;
      
    case 'twitch':
      // Twitch: prefer highest resolution thumbnail
      const twitchSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (twitchSorted.length > 0) {
        console.log(`🎮 [TWITCH] Using thumbnail: ${twitchSorted[0].width}x${twitchSorted[0].height}`);
        return twitchSorted[0].url;
      }
      break;
      
    case 'kick':
      // Kick: prefer highest quality available
      const kickSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (kickSorted.length > 0) {
        console.log(`⚽ [KICK] Using thumbnail: ${kickSorted[0].width}x${kickSorted[0].height}`);
        return kickSorted[0].url;
      }
      break;
      
    case 'rumble':
      // Rumble: prefer highest resolution
      const rumbleSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (rumbleSorted.length > 0) {
        console.log(`📺 [RUMBLE] Using thumbnail: ${rumbleSorted[0].width}x${rumbleSorted[0].height}`);
        return rumbleSorted[0].url;
      }
      break;
      
    default:
      // Generic: highest resolution available
      const genericSorted = thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      if (genericSorted.length > 0) {
        return genericSorted[0].url;
      }
  }
  
  // Fallback: first available thumbnail with URL
  const fallback = thumbnails.find(t => t.url);
  if (fallback) {
    console.log(`🔄 [FALLBACK] Using fallback thumbnail for ${platform}`);
    return fallback.url;
  }
  
  // Final fallback: metadata.thumbnail
  return metadata.thumbnail;
}

/**
 * Extract actual video frame using ffmpeg through yt-dlp
 */
async function extractVideoFrame(url) {
  return new Promise((resolve, reject) => {
    console.log('🎬 [FRAME] Extracting video frame for thumbnail...');
    
    const outputPath = `/tmp/thumbnail_${Date.now()}.jpg`;
    
    // Use yt-dlp with ffmpeg to extract a frame at 10% duration
    const args = [
      '--no-download',
      '--get-url',
      '--format', 'best[height<=720]', // Limit quality for faster processing
      url
    ];
    
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
        console.log('📺 [FRAME] Got direct video URL, extracting frame...');
        
        // Now use ffmpeg to extract frame from direct URL
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
    console.log('🎞️ [FFMPEG] Extracting frame at 10% duration...');
    
    // FFmpeg command to extract frame at 10% of video duration
    const args = [
      '-i', videoUrl,
      '-vf', 'select=gte(n\\,1)', // Skip first frame, get second frame
      '-vframes', '1',
      '-f', 'image2',
      '-q:v', '2', // High quality
      '-y', // Overwrite output file
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
          // Convert extracted frame to base64 data URL for immediate preview
          const fs = require('fs');
          const frameBuffer = fs.readFileSync(outputPath);
          const base64Frame = frameBuffer.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64Frame}`;
          
          // Clean up temp file
          fs.unlinkSync(outputPath);
          
          console.log('✅ [FFMPEG] Successfully extracted video frame');
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
  // Try to find avatar or channel thumbnail
  const avatar = thumbnails.find(t => 
    t.id?.includes('avatar') || 
    t.url?.includes('avatar') ||
    t.id?.includes('channel') ||
    t.url?.includes('channel')
  );
  
  if (avatar) {
    console.log(`👤 [LIVE] Using channel avatar for ${platform}`);
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
    // Create a File-like object from buffer for upload
    const timestamp = Date.now();
    const urlHash = Buffer.from(originalUrl).toString('base64').slice(0, 16);
    const fileName = `extracted_frame_${urlHash}_${timestamp}.jpg`;
    
    // Create blob from buffer
    const blob = new Blob([frameBuffer], { type: 'image/jpeg' });
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    
    console.log('📤 [FIREBASE] Uploading extracted frame...');
    const result = await uploadClipperThumbnail(file, `frame_${timestamp}`);
    
    console.log('✅ [FIREBASE] Frame uploaded successfully');
    return result.url;
    
  } catch (error) {
    console.error('❌ [FIREBASE] Failed to upload frame:', error);
    throw error;
  }
}

/**
 * Enhanced thumbnail extraction with frame fallback
 */
async function getBestThumbnailWithFrames(metadata, url) {
  const platform = detectPlatform(url);
  const thumbnail = getBestThumbnail(metadata, url);
  
  // For platforms that often have thumbnail issues, prefer frame extraction
  const preferFrameExtraction = ['twitch', 'kick', 'rumble'].includes(platform);
  
  // For live streams, use live indicators
  const isLive = metadata.is_live || metadata.live_status === 'is_live';
  if (isLive) {
    console.log('🔴 [LIVE] Returning live stream indicator');
    return thumbnail; // Will be live indicator from getBestThumbnail
  }
  
  // If we prefer frame extraction or thumbnail is problematic, extract frame
  if (preferFrameExtraction || !thumbnail || thumbnail.includes('placeholder') || thumbnail.includes('data:image/svg')) {
    console.log(`🎬 [PREFERENCE] Extracting frame for ${platform} (prefer: ${preferFrameExtraction})`);
    
    try {
      const frameUrl = await extractVideoFrame(url);
      
      if (frameUrl) {
        console.log('✅ [FRAME] Using extracted video frame as thumbnail');
        return frameUrl;
      }
    } catch (error) {
      console.warn('⚠️ [FRAME] Frame extraction failed, falling back to thumbnail:', error.message);
    }
  }
  
  // Return original thumbnail if frame extraction failed
  console.log('🔄 [ORIGINAL] Using original thumbnail');
  return thumbnail;
}