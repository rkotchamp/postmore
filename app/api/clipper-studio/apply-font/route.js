/**
 * API Route: Apply Font to Video Captions
 * POST /api/clipper-studio/apply-font
 * Proxies caption font application to Railway server
 */

import { NextResponse } from 'next/server';

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, captionData, fontKey = 'roboto', clipId, position = 'bottom' } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    if (!captionData || !captionData.captions || captionData.captions.length === 0) {
      return NextResponse.json({ error: 'captionData with captions array is required' }, { status: 400 });
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    console.log(`[APPLY-FONT-PROXY] Proxying font application to Railway: ${fontKey}`);

    // Call Railway /apply-captions endpoint
    const railwayResponse = await fetch(`${RAILWAY_API_URL}/apply-captions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VIDEO_API_SECRET}`
      },
      body: JSON.stringify({ videoUrl, captionData, fontKey, clipId, position })
    });

    if (!railwayResponse.ok) {
      const errorData = await railwayResponse.json().catch(() => ({}));
      console.error(`[APPLY-FONT-PROXY] Railway error:`, errorData);
      return NextResponse.json(
        { error: errorData.error || 'Font application failed' },
        { status: railwayResponse.status }
      );
    }

    const result = await railwayResponse.json();

    if (!result.success || !result.url) {
      return NextResponse.json({ error: 'Processing failed - no URL returned' }, { status: 500 });
    }

    // Fetch processed video from Firebase and return as download
    const videoResponse = await fetch(result.url);
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch processed video' }, { status: 500 });
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const outputFileName = `clip_${clipId || Date.now()}_font_${fontKey}.mp4`;

    console.log(`[APPLY-FONT-PROXY] Returning ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB video`);

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[APPLY-FONT-PROXY] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to apply font to video', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to list available fonts (proxies to Railway)
export async function GET(request) {
  try {
    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    const railwayResponse = await fetch(`${RAILWAY_API_URL}/fonts`, {
      headers: { 'Authorization': `Bearer ${VIDEO_API_SECRET}` }
    });

    if (!railwayResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch fonts' }, { status: railwayResponse.status });
    }

    const data = await railwayResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[APPLY-FONT-PROXY] Error listing fonts:', error.message);
    return NextResponse.json({ error: 'Failed to list fonts', details: error.message }, { status: 500 });
  }
}
