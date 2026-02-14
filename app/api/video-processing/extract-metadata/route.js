/**
 * Video Metadata Extraction API Route
 * Proxies metadata extraction to Railway video processing service
 */

import { NextResponse } from 'next/server';

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

function detectPlatform(url) {
  if (!url) return 'other';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitch.tv')) return 'twitch';
  if (lowerUrl.includes('kick.com')) return 'kick';
  if (lowerUrl.includes('rumble.com')) return 'rumble';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('vimeo.com')) return 'vimeo';
  return 'other';
}

async function callRailway(endpoint, body) {
  const response = await fetch(`${RAILWAY_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VIDEO_API_SECRET}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Railway returned ${response.status}`);
  return data;
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    console.log(`[METADATA] Extracting metadata via Railway: ${url}`);

    const result = await callRailway('/metadata', { url });
    const railwayMetadata = result.metadata;
    const platform = railwayMetadata.platform || detectPlatform(url);

    // Extract frame for thumbnail if needed (Kick, Rumble, Twitch often lack good thumbnails)
    let thumbnail = railwayMetadata.thumbnail || null;
    const needsFrameExtraction = ['kick', 'rumble', 'twitch'].includes(platform);
    const hasBadThumbnail = !thumbnail || thumbnail.includes('placeholder') || thumbnail.includes('data:image/svg');

    if ((needsFrameExtraction || hasBadThumbnail) && !railwayMetadata.is_live) {
      try {
        console.log('[METADATA] Extracting frame for thumbnail...');
        const frameResult = await callRailway('/extract-frame', {
          url,
          timestamp: Math.min(5, (railwayMetadata.duration || 10) * 0.1)
        });
        if (frameResult.success && frameResult.thumbnail) {
          thumbnail = frameResult.thumbnail;
        }
      } catch (frameError) {
        console.warn('[METADATA] Frame extraction failed:', frameError.message);
      }
    }

    return NextResponse.json({
      success: true,
      metadata: {
        title: railwayMetadata.title || 'Unknown Title',
        description: railwayMetadata.description || '',
        duration: railwayMetadata.duration || 0,
        thumbnail,
        thumbnails: railwayMetadata.thumbnails || [],
        uploader: railwayMetadata.uploader || 'Unknown',
        upload_date: railwayMetadata.uploadDate,
        view_count: railwayMetadata.viewCount,
        like_count: railwayMetadata.likeCount,
        width: railwayMetadata.width,
        height: railwayMetadata.height,
        fps: railwayMetadata.fps,
        url: railwayMetadata.originalUrl || url,
        id: railwayMetadata.id,
        platform,
        is_live: false
      }
    });

  } catch (error) {
    console.error('[METADATA] Extraction failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
