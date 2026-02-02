import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import VideoProject from "@/app/models/VideoProject";

/**
 * GET endpoint to fetch user's video projects
 * Supports pagination and filtering
 */
export async function GET(request) {
  try {
    console.log('📋 [PROJECTS] Fetching user projects...');
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    const { searchParams } = new URL(request.url);
    const includeUnsaved = searchParams.get('includeUnsaved') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    console.log(`👤 [PROJECTS] Fetching for user: ${session.user.id}`);
    console.log(`📊 [PROJECTS] Include unsaved: ${includeUnsaved}, Limit: ${limit}, Page: ${page}`);

    // Build query
    const query = { userId: session.user.id };
    if (!includeUnsaved) {
      query["saveStatus.isSaved"] = true;
    }

    // Get projects with pagination
    const projects = await VideoProject.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalCount = await VideoProject.countDocuments(query);

    console.log(`✅ [PROJECTS] Found ${projects.length} projects (${totalCount} total)`);

    // Map database fields to frontend expected format
    const mappedProjects = projects.map(project => ({
      ...project,
      // Map analytics fields to frontend expected fields
      progress: project.analytics?.progressPercentage || 0,
      status: project.analytics?.processingStage || project.status || 'processing',
      progressMessage: project.analytics?.progressMessage || 'we\'re cooking 👨‍🍳',
      // Keep other fields as they are
      id: project._id,
      title: project.originalVideo?.title || project.sourceUrl || 'Untitled Video',
      url: project.sourceUrl || ''
    }));

    return NextResponse.json({
      success: true,
      projects: mappedProjects,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount
      }
    });

  } catch (error) {
    console.error("========== Video Projects API Failed ==========");
    console.error('❌ [PROJECTS] Fetch failed:', error);
    return NextResponse.json({
      error: "Failed to fetch video projects"
    }, { status: 500 });
  }
}

/**
 * POST endpoint to create a new video project
 */
export async function POST(request) {
  try {
    console.log('🆕 [PROJECTS] Creating new project...');
    
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    const body = await request.json();
    const {
      sourceUrl,
      sourceType,
      originalVideo,
      metadata
    } = body;

    console.log(`📹 [PROJECTS] Creating project for: ${sourceType === 'url' ? sourceUrl : originalVideo?.filename}`);

    // Validate required fields
    if (!sourceType || !['url', 'upload'].includes(sourceType)) {
      return NextResponse.json({
        error: 'Invalid or missing sourceType'
      }, { status: 400 });
    }

    if (sourceType === 'url' && !sourceUrl) {
      return NextResponse.json({
        error: 'sourceUrl is required for URL projects'
      }, { status: 400 });
    }

    if (sourceType === 'upload' && !originalVideo?.filename) {
      return NextResponse.json({
        error: 'originalVideo data is required for upload projects'
      }, { status: 400 });
    }

    // Create project data
    const projectData = {
      userId: session.user.id,
      sourceType,
      status: 'processing',
      processingStarted: new Date(),
    };

    // Add source-specific data
    if (sourceType === 'url') {
      projectData.sourceUrl = sourceUrl;
    }

    if (originalVideo) {
      projectData.originalVideo = originalVideo;
    }

    // Add metadata if provided
    if (metadata) {
      if (metadata.title && projectData.originalVideo) {
        projectData.originalVideo.title = metadata.title;
      }
      if (metadata.duration && projectData.originalVideo) {
        projectData.originalVideo.duration = metadata.duration;
      }
    }

    // Create the project
    const project = new VideoProject(projectData);
    await project.save();

    console.log(`✅ [PROJECTS] Project created with ID: ${project._id}`);

    return NextResponse.json({
      success: true,
      project: {
        id: project._id,
        sourceType: project.sourceType,
        sourceUrl: project.sourceUrl,
        originalVideo: project.originalVideo,
        status: project.status,
        createdAt: project.createdAt,
        saveStatus: project.saveStatus
      }
    }, { status: 201 });

  } catch (error) {
    console.error("========== Video Project Creation Failed ==========");
    console.error('❌ [PROJECTS] Creation failed:', error);
    return NextResponse.json({
      error: "Failed to create video project"
    }, { status: 500 });
  }
}