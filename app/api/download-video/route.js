import { NextResponse } from 'next/server';

/**
 * POST /api/download-video
 * Proxy endpoint to download videos from Firebase Storage and return as downloadable file
 * This bypasses CORS by downloading server-side and streaming to client
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, filename } = body;
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }
    
    console.log(`📥 [DOWNLOAD-PROXY] Fetching video: ${filename || 'video.mp4'}`);
    
    // Fetch the video from Firebase Storage (server-side, no CORS issues)
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    
    // Get the video as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Create proper filename
    const downloadFilename = filename || 'video.mp4';
    
    console.log(`✅ [DOWNLOAD-PROXY] Downloaded ${arrayBuffer.byteLength} bytes for ${downloadFilename}`);
    
    // Return the video with proper download headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
    
  } catch (error) {
    console.error('❌ [DOWNLOAD-PROXY] Error downloading video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download video', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}