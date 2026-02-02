import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VideoClip from '@/app/models/VideoClip';
import VideoProject from '@/app/models/VideoProject';
import connectToMongoose from '@/app/lib/db/mongoose';

/**
 * GET /api/clipper-studio/projects/[id]/clips
 * Fetch all clips for a specific project
 */
export async function GET(request, { params }) {
  const { id: projectId } = await params;
  console.log('📋 [CLIPS-API] Fetching clips for project:', projectId);
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [CLIPS-API] Unauthorized - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    
    // Verify project exists and belongs to user
    const project = await VideoProject.findOne({ 
      _id: projectId, 
      userId: session.user.id 
    });
    
    if (!project) {
      console.error(`❌ [CLIPS-API] Project ${projectId} not found or unauthorized`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Fetch clips for this project
    const clips = await VideoClip.find({ 
      projectId: projectId,
      userId: session.user.id 
    }).sort({ startTime: 1 }); // Sort by start time
    
    console.log(`✅ [CLIPS-API] Found ${clips.length} clips for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      projectId: projectId,
      clips: clips.map(clip => ({
        id: clip._id,
        title: clip.title,
        templateHeader: clip.templateHeader, // Add templateHeader field
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        viralityScore: clip.viralityScore,
        status: clip.status,
        videoUrl: clip.generatedVideo?.vertical?.url || clip.generatedVideo?.horizontal?.url || clip.generatedVideo?.url || null,
        hasProcessedVideo: !!(clip.generatedVideo?.vertical?.url || clip.generatedVideo?.horizontal?.url || clip.generatedVideo?.url),
        // Dual aspect ratio support
        verticalVideoUrl: clip.generatedVideo?.vertical?.url || null,
        horizontalVideoUrl: clip.generatedVideo?.horizontal?.url || null,
        // Preview video for templates
        previewVideo: clip.previewVideo || null,
        createdAt: clip.createdAt
      })),
      totalClips: clips.length,
      processedClips: clips.filter(clip => clip.generatedVideo?.vertical?.url || clip.generatedVideo?.horizontal?.url || clip.generatedVideo?.url).length
    });
    
  } catch (error) {
    console.error('❌ [CLIPS-API] Failed to fetch clips:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}