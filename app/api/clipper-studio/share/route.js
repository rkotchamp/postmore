import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import mongoose from "mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import { processClipForSharing } from "@/app/lib/video-sharing/services/videoProcessingService";
import { apiManager } from "@/app/lib/api/services/apiManager";

// Import Post model
let Post;
try {
  Post = mongoose.model("Post");
} catch (e) {
  try {
    require("@/app/models/PostSchema");
    Post = mongoose.model("Post");
  } catch (modelError) {
    console.error("Failed to load Post schema:", modelError);
  }
}

/**
 * POST /api/clipper-studio/share
 * Share clips to multiple social media accounts with template/caption processing
 *
 * Request body:
 * {
 *   shares: [
 *     {
 *       clipId: string,
 *       accountId: string,
 *       clip: { videoUrl, title, ... },
 *       account: { platform, ... },
 *       caption: string
 *     }
 *   ],
 *   scheduleTime: Date (optional) - if provided, schedule instead of immediate post,
 *   templateData: Object (optional) - template settings if applied,
 *   captionSettings: Object (optional) - caption style settings
 * }
 */
export async function POST(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { shares, scheduleTime, templateData, captionSettings } = body;

    console.log('📤 [SHARE_API] Received share request:', {
      sharesCount: shares?.length,
      hasScheduleTime: !!scheduleTime,
      hasTemplateData: !!templateData,
      hasCaptionSettings: !!captionSettings
    });

    if (!shares || !Array.isArray(shares) || shares.length === 0) {
      return NextResponse.json(
        { success: false, error: "No shares provided" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Determine if this is scheduled or immediate posting
    const isScheduled = !!scheduleTime;

    // Process all shares in parallel (with concurrency limit)
    const CONCURRENCY_LIMIT = 3; // Process 3 at a time to avoid rate limits
    const results = [];

    for (let i = 0; i < shares.length; i += CONCURRENCY_LIMIT) {
      const batch = shares.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(share => processShare(share, userId, {
          scheduleTime,
          templateData,
          captionSettings,
          isScheduled
        }))
      );
      results.push(...batchResults);
    }

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      successCount,
      failedCount,
      totalCount: shares.length,
      isScheduled,
    });

  } catch (error) {
    console.error("[SHARE_API] Error sharing clips:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to share clips",
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single clip-account share with video processing
 */
async function processShare(share, userId, options = {}) {
  const { clipId, accountId, clip, account, caption, captionData } = share;
  const { scheduleTime, templateData, captionSettings, isScheduled } = options;

  try {
    console.log(`🎬 [SHARE_API] Processing share for clip ${clipId} to account ${accountId}`);
    console.log(`📝 [SHARE_API] Has caption data: ${!!captionData}`);
    if (captionData) {
      console.log(`📝 [SHARE_API] Caption segments: ${captionData.captions?.length || 0}`);
    }

    // Verify the account belongs to this user
    const socialAccount = await SocialAccount.findOne({
      _id: accountId,
      userId: userId,
    });

    if (!socialAccount) {
      throw new Error("Account not found or unauthorized");
    }

    // Step 1: Process video with templates/captions if needed
    console.log('🎥 [SHARE_API] Processing video with templates/captions...');
    const processedVideoUrl = await processClipForSharing(
      clip,
      templateData,
      captionData || clip.captions || null,
      captionSettings
    );

    console.log('✅ [SHARE_API] Video processed, URL:', processedVideoUrl);

    // Step 2: Create Post document in database
    const postDocument = {
      userId: userId,
      contentType: 'media',
      text: caption || '',
      media: [{
        id: `${clipId}_${Date.now()}`,
        type: 'video',
        url: processedVideoUrl,
        thumbnail: clip.thumbnail || null,
      }],
      accounts: [{
        id: socialAccount.id || socialAccount._id.toString(),
        name: socialAccount.name || socialAccount.username,
        email: socialAccount.email,
        type: socialAccount.platform.toLowerCase(),
        platformAccountId: socialAccount.platformAccountId || socialAccount.platformId || socialAccount.id,
      }],
      captions: {
        mode: 'single',
        single: caption || '',
        multiple: {},
      },
      schedule: isScheduled ? {
        type: 'scheduled',
        at: new Date(scheduleTime)
      } : {
        type: 'now'
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`💾 [SHARE_API] Creating Post document in database...`);
    const savedPost = await Post.create(postDocument);
    console.log(`✅ [SHARE_API] Post document created with ID: ${savedPost._id}`);

    // Step 3: Call apiManager to schedule/post
    const postData = {
      userId: userId,
      postId: savedPost._id.toString(),
      contentType: 'media',
      text: caption || '',
      media: [{
        id: `${clipId}_${Date.now()}`,
        type: 'video/mp4',
        url: processedVideoUrl,
        originalName: `${clip.title || 'clip'}.mp4`,
      }],
      captions: caption || '',
    };

    let result;
    if (isScheduled) {
      console.log(`📅 [SHARE_API] Scheduling post via apiManager...`);
      result = await apiManager.schedulePost(
        socialAccount.platform.toLowerCase(),
        socialAccount,
        postData,
        new Date(scheduleTime)
      );
    } else {
      console.log(`📤 [SHARE_API] Posting immediately via apiManager...`);
      result = await apiManager.postToPlatform(
        socialAccount.platform.toLowerCase(),
        socialAccount,
        postData
      );
    }

    // Step 4: Update Post document with results
    savedPost.status = isScheduled ? 'scheduled' : (result.success ? 'published' : 'failed');
    savedPost.results = [{
      platform: socialAccount.platform,
      accountId: socialAccount.id || socialAccount._id.toString(),
      success: result.success,
      postId: result.postId || result.jobId || null,
      url: result.url || result.postUrl || null,
      error: result.error || null,
      scheduledTime: isScheduled ? new Date(scheduleTime) : null,
      timestamp: new Date(),
    }];
    await savedPost.save();

    // Update last used time for account
    socialAccount.lastUsed = new Date();
    await socialAccount.save();

    console.log(`✅ [SHARE_API] Successfully ${isScheduled ? 'scheduled' : 'posted'} to ${socialAccount.platform}`);

    return {
      success: true,
      clipId,
      accountId,
      platform: socialAccount.platform,
      postId: savedPost._id.toString(),
      postUrl: result.url || result.postUrl || null,
      isScheduled,
      scheduledFor: isScheduled ? scheduleTime : null,
    };

  } catch (error) {
    console.error(`[SHARE_API] Error sharing clip ${clipId} to account ${accountId}:`, error);
    return {
      success: false,
      clipId,
      accountId,
      platform: account?.platform || 'unknown',
      error: error.message,
      isScheduled,
    };
  }
}

