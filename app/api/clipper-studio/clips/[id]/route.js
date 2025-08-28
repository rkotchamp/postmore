import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VideoClip from '@/app/models/VideoClip';
import connectToMongoose from '@/app/lib/db/mongoose';

/**
 * PATCH /api/clipper-studio/clips/[id]
 * Update individual clip properties (templateHeader, etc.)
 */
export async function PATCH(request, { params }) {
  const { id: clipId } = await params;
  console.log('🎬 [CLIP-UPDATE-API] Updating clip:', clipId);
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [CLIP-UPDATE-API] Unauthorized - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 [CLIP-UPDATE-API] Update payload:', body);

    await connectToMongoose();
    
    // Verify clip exists and belongs to user
    const clip = await VideoClip.findOne({ 
      _id: clipId, 
      userId: session.user.id 
    });
    
    if (!clip) {
      console.error(`❌ [CLIP-UPDATE-API] Clip ${clipId} not found or unauthorized`);
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Validate update fields - only allow specific fields to be updated
    const allowedFields = ['templateHeader', 'title'];
    const updates = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      } else {
        console.warn(`⚠️ [CLIP-UPDATE-API] Ignoring disallowed field: ${key}`);
      }
    }

    if (Object.keys(updates).length === 0) {
      console.error('❌ [CLIP-UPDATE-API] No valid fields to update');
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    // Update the clip
    const updatedClip = await VideoClip.findByIdAndUpdate(
      clipId,
      updates,
      { new: true, runValidators: true }
    );

    console.log(`✅ [CLIP-UPDATE-API] Successfully updated clip ${clipId}:`, updates);

    return NextResponse.json({
      success: true,
      clip: {
        id: updatedClip._id,
        title: updatedClip.title,
        templateHeader: updatedClip.templateHeader,
        startTime: updatedClip.startTime,
        endTime: updatedClip.endTime,
        duration: updatedClip.duration,
        viralityScore: updatedClip.viralityScore,
        status: updatedClip.status,
        videoUrl: updatedClip.generatedVideo?.vertical?.url || updatedClip.generatedVideo?.horizontal?.url || updatedClip.generatedVideo?.url || null,
        hasProcessedVideo: !!(updatedClip.generatedVideo?.vertical?.url || updatedClip.generatedVideo?.horizontal?.url || updatedClip.generatedVideo?.url),
        verticalVideoUrl: updatedClip.generatedVideo?.vertical?.url || null,
        horizontalVideoUrl: updatedClip.generatedVideo?.horizontal?.url || null,
        previewVideo: updatedClip.previewVideo || null,
        createdAt: updatedClip.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ [CLIP-UPDATE-API] Failed to update clip:', error);
    
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