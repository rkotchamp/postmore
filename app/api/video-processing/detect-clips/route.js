import { NextResponse } from 'next/server';
import VideoProject from '@/app/models/VideoProject';
import connectToMongoose from '@/app/lib/db/mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const RAILWAY_API_URL = process.env.VIDEO_PROCESSING_API_URL || process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

/**
 * Trigger the Railway video processing pipeline
 * This is a thin proxy that authenticates the user, creates/validates the project,
 * then delegates all heavy processing to Railway.
 */
export async function POST(request) {
  console.log('[CLIP-API] Starting clip detection request...');

  try {
    const body = await request.json();
    const { url, projectId } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!RAILWAY_API_URL) {
      console.error('[CLIP-API] VIDEO_PROCESSING_API_URL not configured');
      return NextResponse.json({ error: 'Video processing service not configured' }, { status: 503 });
    }

    await connectToMongoose();

    const { options = {} } = body;
    const captionOptions = {
      enableCaptions: body.enableCaptions !== false,
      captionStyle: body.captionStyle || 'tiktok',
      maxWordsPerLine: body.maxWordsPerLine || 3,
      captionPosition: body.captionPosition || 'bottom',
      customCaptionSettings: body.customCaptionSettings || {}
    };

    // Ensure project exists
    let activeProjectId = projectId;
    if (projectId) {
      const project = await VideoProject.findOne({ _id: projectId, userId: session.user.id });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Update project status
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'processing',
          processingStarted: new Date(),
          'analytics.processingStage': 'downloading',
          'analytics.progressPercentage': 0,
          'analytics.progressMessage': "we're cooking"
        }
      });
    }

    // Trigger Railway pipeline (non-blocking fetch with short timeout)
    console.log(`[CLIP-API] Triggering Railway pipeline for project ${activeProjectId}`);

    const railwayUrl = `${RAILWAY_API_URL}/process-clips-pipeline`;

    // Fire and forget - Railway will update MongoDB directly
    fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VIDEO_API_SECRET}`
      },
      body: JSON.stringify({
        url,
        projectId: activeProjectId,
        userId: session.user.id,
        options,
        captionOptions
      })
    }).catch(error => {
      console.error(`[CLIP-API] Failed to trigger Railway pipeline:`, error.message);
      // Update project to error state
      VideoProject.findByIdAndUpdate(activeProjectId, {
        $set: {
          status: 'error',
          processingCompleted: new Date(),
          'analytics.processingStage': 'error',
          'analytics.error': `Failed to reach processing server: ${error.message}`
        }
      }).catch(e => console.error('[CLIP-API] Failed to update error state:', e.message));
    });

    // Return immediately - frontend polls for progress via MongoDB
    return NextResponse.json({
      success: true,
      message: 'Video processing started',
      projectId: activeProjectId,
      status: 'processing',
      estimatedTime: '5-15 minutes for large videos'
    });

  } catch (error) {
    console.error('[CLIP-API] Clip detection failed:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: { timestamp: new Date().toISOString() }
    }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({
    service: 'Clip Detection (Railway Pipeline)',
    healthy: !!RAILWAY_API_URL,
    railwayConfigured: !!RAILWAY_API_URL,
    timestamp: new Date().toISOString()
  });
}
