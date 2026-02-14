/**
 * Video Processing API Route
 * Proxies FFmpeg operations to Railway server
 */

import { NextResponse } from 'next/server';

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

export async function POST(request) {
  try {
    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { videoUrl, operation, options = {} } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    if (!operation) {
      return NextResponse.json({ error: 'operation is required (cut, resize, extract-audio)' }, { status: 400 });
    }

    console.log(`[PROCESS-PROXY] Proxying ${operation} to Railway`);

    const railwayResponse = await fetch(`${RAILWAY_API_URL}/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VIDEO_API_SECRET}`
      },
      body: JSON.stringify({ videoUrl, operation, options })
    });

    if (!railwayResponse.ok) {
      const errorData = await railwayResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Processing failed: ${railwayResponse.status}` },
        { status: railwayResponse.status }
      );
    }

    const result = await railwayResponse.json();

    return NextResponse.json({
      success: true,
      operation,
      result,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[PROCESS-PROXY] Error:', error.message);
    return NextResponse.json(
      { error: 'Video processing failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Video Processing (Railway)',
    healthy: !!RAILWAY_API_URL,
    supportedOperations: ['cut', 'resize', 'extract-audio'],
    timestamp: new Date().toISOString()
  });
}
