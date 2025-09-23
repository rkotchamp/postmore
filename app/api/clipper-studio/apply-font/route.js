/**
 * API Route: Apply Font to Video Captions
 * POST /api/clipper-studio/apply-font
 *
 * Applies selected font to video captions using Smart Caption Management
 * Takes a clean video (no captions) and applies captions with selected font
 */

import { NextResponse } from 'next/server';
import { applyCaptionsWithFont } from '@/app/lib/video-processing/services/captionService';
import fontManager from '@/app/lib/video-processing/fonts/fontManager';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    console.log('🎨 [APPLY-FONT-API] Starting font application request');

    const body = await request.json();
    const {
      videoUrl,
      captionData,
      fontKey = 'roboto',
      clipId,
      position = 'bottom'
    } = body;

    // Validate required parameters
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    if (!captionData || !captionData.captions || captionData.captions.length === 0) {
      return NextResponse.json(
        { error: 'captionData with captions array is required' },
        { status: 400 }
      );
    }

    if (!fontManager.isFontSupported(fontKey)) {
      return NextResponse.json(
        { error: `Unsupported font: ${fontKey}. Available fonts: ${Object.keys(fontManager.CAPTION_FONTS).join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🎬 [APPLY-FONT-API] Processing video with font: ${fontKey}`);
    console.log(`📝 [APPLY-FONT-API] Caption count: ${captionData.captions.length}`);
    console.log(`📍 [APPLY-FONT-API] Position: ${position}`);

    // Initialize font system
    await fontManager.initializeFonts();

    // Create temporary output path
    const timestamp = Date.now();
    const outputFileName = `clip_${clipId || timestamp}_font_${fontKey}.mp4`;
    const outputPath = path.join('/tmp', outputFileName);

    console.log(`📁 [APPLY-FONT-API] Output path: ${outputPath}`);

    // Determine if we need to download the video first
    let inputVideoPath = videoUrl;
    let needsCleanup = false;

    // If videoUrl is a URL (not local path), download it first
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      console.log(`⬇️ [APPLY-FONT-API] Downloading video from URL: ${videoUrl}`);

      const downloadPath = path.join('/tmp', `input_${timestamp}.mp4`);

      // Download video
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(downloadPath, Buffer.from(buffer));

      inputVideoPath = downloadPath;
      needsCleanup = true;

      console.log(`✅ [APPLY-FONT-API] Video downloaded to: ${downloadPath}`);
    }

    // Apply captions with selected font
    const resultPath = await applyCaptionsWithFont(
      inputVideoPath,
      captionData,
      fontKey,
      outputPath,
      {
        position: position,
        videoWidth: 1080,
        videoHeight: 1920
      }
    );

    console.log(`✅ [APPLY-FONT-API] Font application completed: ${resultPath}`);

    // Read the processed video file
    if (!fs.existsSync(resultPath)) {
      throw new Error('Processed video file not found');
    }

    const videoBuffer = fs.readFileSync(resultPath);

    // Cleanup temporary files
    try {
      if (needsCleanup && fs.existsSync(inputVideoPath)) {
        fs.unlinkSync(inputVideoPath);
        console.log(`🧹 [APPLY-FONT-API] Cleaned up input file: ${inputVideoPath}`);
      }

      if (fs.existsSync(resultPath)) {
        fs.unlinkSync(resultPath);
        console.log(`🧹 [APPLY-FONT-API] Cleaned up output file: ${resultPath}`);
      }
    } catch (cleanupError) {
      console.warn(`⚠️ [APPLY-FONT-API] Cleanup warning: ${cleanupError.message}`);
    }

    // Return the video file
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ [APPLY-FONT-API] Error applying font to video:', error);

    return NextResponse.json(
      {
        error: 'Failed to apply font to video',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list available fonts
export async function GET(request) {
  try {
    console.log('📋 [APPLY-FONT-API] Listing available fonts');

    const fonts = fontManager.getAvailableFonts();

    // Format fonts for frontend consumption
    const formattedFonts = Object.entries(fonts).map(([key, font]) => ({
      key,
      name: font.name,
      family: font.family,
      weight: font.weight,
      description: font.description,
      systemFont: font.systemFont || font.ffmpegFont
    }));

    return NextResponse.json({
      fonts: formattedFonts,
      defaultFont: fontManager.getDefaultFont(),
      count: formattedFonts.length
    });

  } catch (error) {
    console.error('❌ [APPLY-FONT-API] Error listing fonts:', error);

    return NextResponse.json(
      {
        error: 'Failed to list fonts',
        details: error.message
      },
      { status: 500 }
    );
  }
}