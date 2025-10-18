import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToMongoose from '@/app/lib/db/mongoose';
import VideoProject from '@/app/models/VideoProject';
import VideoClip from '@/app/models/VideoClip';
import { generateClipWebVTT, getWebVttMimeType } from '@/app/lib/video-processing/services/webVttService';

/**
 * Serve WebVTT captions for a specific clip
 * GET /api/clipper-studio/captions/[clipId]
 */
export async function GET(request, { params }) {
  // Await params first
  const { clipId } = await params;
  console.log(`📝 [CAPTIONS-API] Serving WebVTT for clip ${clipId}`);

  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToMongoose();

    // Get clip and verify ownership
    const clip = await VideoClip.findOne({
      _id: clipId,
      userId: session.user.id
    });

    if (!clip) {
      console.log(`❌ [CAPTIONS-API] Clip not found or unauthorized: ${clipId}`);
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Get project with transcription data
    const project = await VideoProject.findById(clip.projectId);
    if (!project) {
      console.log(`❌ [CAPTIONS-API] Project not found: ${clip.projectId}`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.transcription?.segments) {
      console.log(`⚠️ [CAPTIONS-API] No transcription data for project ${clip.projectId}`);
      // Return empty WebVTT file instead of error for graceful fallback
      const emptyWebVTT = 'WEBVTT\n\nNOTE No captions available\n\n';
      return new Response(emptyWebVTT, {
        status: 200,
        headers: {
          'Content-Type': getWebVttMimeType(),
          'Content-Disposition': `inline; filename="clip-${clipId}.vtt"`,
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }

    // Get position from query parameters
    const url = new URL(request.url);
    const position = url.searchParams.get('position') || 'bottom';

    // Generate WebVTT for this specific clip
    console.log(`🎬 [CAPTIONS-API] Generating WebVTT for clip ${clipId}:`);
    console.log(`  - Clip timing: ${clip.startTime}s - ${clip.endTime}s (${clip.endTime - clip.startTime}s duration)`);
    console.log(`  - Total project segments: ${project.transcription.segments?.length || 0}`);
    console.log(`  - Position: ${position}`);

    const webvttContent = generateClipWebVTT({
      startTime: clip.startTime,
      endTime: clip.endTime,
      projectId: clip.projectId
    }, project.transcription, { position });

    console.log(`✅ [CAPTIONS-API] Generated WebVTT for clip ${clipId} (${webvttContent.length} characters)`);
    console.log(`📝 [CAPTIONS-API] WebVTT preview: ${webvttContent.substring(0, 200)}...`);

    // Return WebVTT file with proper headers
    return new Response(webvttContent, {
      status: 200,
      headers: {
        'Content-Type': getWebVttMimeType(),
        'Content-Disposition': `inline; filename="clip-${clipId}.vtt"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow cross-origin for video players
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error(`❌ [CAPTIONS-API] Error serving WebVTT:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 * OPTIONS /api/clipper-studio/captions/[clipId]
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}