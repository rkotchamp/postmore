/**
 * Video Download API Route
 * Proxies video downloads to Railway video processing service
 */

import { NextResponse } from 'next/server';

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

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
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported video platform. Supported: YouTube, Twitch, Kick, Rumble, TikTok, Instagram, Vimeo' },
        { status: 400 }
      );
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    console.log(`[DOWNLOAD] Forwarding to Railway: ${platform} - ${url}`);

    const metadataResult = await callRailway('/metadata', { url });
    const videoInfo = metadataResult.metadata;

    const downloadResult = await callRailway('/download', {
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
      processing: {
        estimatedClips: Math.ceil(videoInfo.duration / 60),
        canProcess: true
      },
      source: 'railway'
    });

  } catch (error) {
    console.error('[DOWNLOAD] Error:', error.message);
    return NextResponse.json({ error: 'Download failed', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    const result = await callRailway('/metadata', { url });
    const videoInfo = result.metadata;

    return NextResponse.json({
      success: true,
      videoInfo,
      platform: result.platform || detectPlatform(url),
      canDownload: !!detectPlatform(url),
      source: 'railway'
    });

  } catch (error) {
    console.error('[DOWNLOAD] Video info error:', error.message);
    return NextResponse.json({ error: 'Failed to get video information', details: error.message }, { status: 500 });
  }
}
