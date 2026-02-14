import { NextResponse } from "next/server";

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

/**
 * POST /api/download-video-with-template
 * Proxies template processing to Railway server
 * Railway handles: Puppeteer rendering, FFmpeg overlay, caption burning, Firebase upload
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, filename, templateData, captionData, captionSettings } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
    }

    if (!templateData || !templateData.template) {
      return NextResponse.json({ error: "Template data is required" }, { status: 400 });
    }

    if (!RAILWAY_API_URL) {
      return NextResponse.json({ error: "Video processing service not configured" }, { status: 503 });
    }

    console.log(`[TEMPLATE-PROXY] Proxying template request to Railway: ${templateData.template}`);

    // Call Railway /process-template endpoint
    const railwayResponse = await fetch(`${RAILWAY_API_URL}/process-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VIDEO_API_SECRET}`
      },
      body: JSON.stringify({ videoUrl, templateData, captionData, captionSettings })
    });

    if (!railwayResponse.ok) {
      const errorData = await railwayResponse.json().catch(() => ({}));
      console.error(`[TEMPLATE-PROXY] Railway error:`, errorData);
      return NextResponse.json(
        { error: errorData.error || "Template processing failed" },
        { status: railwayResponse.status }
      );
    }

    const result = await railwayResponse.json();

    if (!result.success || !result.url) {
      return NextResponse.json({ error: "Processing failed - no URL returned" }, { status: 500 });
    }

    // Fetch the processed video from Firebase URL and stream it back as download
    console.log(`[TEMPLATE-PROXY] Fetching processed video from: ${result.url}`);
    const videoResponse = await fetch(result.url);

    if (!videoResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch processed video" }, { status: 500 });
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const finalBuffer = Buffer.from(videoBuffer);

    console.log(`[TEMPLATE-PROXY] Returning ${(finalBuffer.length / 1024 / 1024).toFixed(2)}MB video: ${filename}`);

    return new Response(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename || 'video.mp4')}"`,
        "Content-Length": finalBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("[TEMPLATE-PROXY] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to process video with template", details: error.message },
      { status: 500 }
    );
  }
}
