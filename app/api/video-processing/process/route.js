/**
 * Video Processing API Route
 * Handles video processing, cutting, and format conversion using FFmpeg
 */

import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import FFmpegService from '@/app/lib/video-processing/services/ffmpegService';
import SubtitleService from '@/app/lib/video-processing/services/subtitleService';
import VideoUtils from '@/app/lib/video-processing/utils/videoUtils';

const ffmpegService = new FFmpegService();
const subtitleService = new SubtitleService();

export async function POST(request) {
  let tempFiles = [];
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const operation = formData.get('operation'); // 'cut', 'resize', 'extract-audio', 'add-subtitles', 'thumbnail'
    const options = JSON.parse(formData.get('options') || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation type is required' },
        { status: 400 }
      );
    }

    // Validate file format
    if (!VideoUtils.isValidVideoFormat(file.name)) {
      return NextResponse.json(
        { error: 'Invalid video format' },
        { status: 400 }
      );
    }

    // Save input file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const inputPath = join(process.cwd(), 'temp', `input-${Date.now()}-${file.name}`);
    VideoUtils.ensureDirectoryExists(join(process.cwd(), 'temp'));
    await writeFile(inputPath, buffer);
    tempFiles.push(inputPath);

    let result;
    
    switch (operation) {
      case 'metadata':
        result = await handleGetMetadata(inputPath);
        break;
      case 'cut':
        result = await handleCutVideo(inputPath, options, tempFiles);
        break;
      case 'resize':
        result = await handleResizeVideo(inputPath, options, tempFiles);
        break;
      case 'extract-audio':
        result = await handleExtractAudio(inputPath, options, tempFiles);
        break;
      case 'add-subtitles':
        result = await handleAddSubtitles(inputPath, formData, options, tempFiles);
        break;
      case 'thumbnail':
        result = await handleCreateThumbnail(inputPath, options, tempFiles);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return NextResponse.json({
      success: true,
      operation: operation,
      result: result,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Video processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Video processing failed',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    await VideoUtils.cleanupFiles(tempFiles);
  }
}

async function handleGetMetadata(inputPath) {
  const metadata = await ffmpegService.getVideoMetadata(inputPath);
  
  return {
    metadata: metadata,
    formatted: {
      duration: VideoUtils.formatDuration(metadata.format?.duration || 0),
      fileSize: VideoUtils.formatFileSize(metadata.format?.size || 0),
      bitrate: metadata.format?.bit_rate || 'Unknown',
      resolution: `${metadata.streams?.[0]?.width || 0}x${metadata.streams?.[0]?.height || 0}`,
      fps: metadata.streams?.[0]?.r_frame_rate || 'Unknown',
      codec: metadata.streams?.[0]?.codec_name || 'Unknown'
    }
  };
}

async function handleCutVideo(inputPath, options, tempFiles) {
  const { startTime, duration, platform } = options;
  
  if (startTime === undefined || duration === undefined) {
    throw new Error('startTime and duration are required for cut operation');
  }

  const outputFilename = VideoUtils.generateUniqueFilename('cut-segment.mp4', 'cut-');
  const outputPath = join(process.cwd(), 'temp', outputFilename);
  tempFiles.push(outputPath);

  // Get platform-specific options if platform is specified
  let processingOptions = {};
  if (platform) {
    const platformSpecs = ffmpegService.getPlatformSpecs(platform);
    processingOptions = {
      videoCodec: platformSpecs.videoCodec || 'libx264',
      audioCodec: platformSpecs.audioCodec || 'aac',
      videoBitrate: platformSpecs.videoBitrate
    };
  }

  const resultPath = await ffmpegService.cutVideoSegment(
    inputPath,
    outputPath,
    startTime,
    duration,
    processingOptions
  );

  // Get output file stats
  const fileSize = await VideoUtils.getFileSize(resultPath);
  
  return {
    outputPath: resultPath,
    startTime: startTime,
    duration: duration,
    fileSize: fileSize,
    formattedFileSize: VideoUtils.formatFileSize(fileSize),
    platform: platform || 'generic'
  };
}

async function handleResizeVideo(inputPath, options, tempFiles) {
  const { platform, width, height } = options;
  
  if (!platform && (!width || !height)) {
    throw new Error('Either platform or width/height dimensions are required for resize operation');
  }

  const outputFilename = VideoUtils.generateUniqueFilename('resized-video.mp4', 'resize-');
  const outputPath = join(process.cwd(), 'temp', outputFilename);
  tempFiles.push(outputPath);

  let resultPath;
  if (platform) {
    resultPath = await ffmpegService.resizeForPlatform(
      inputPath,
      outputPath,
      platform,
      options
    );
  } else {
    // Custom resize implementation would go here
    throw new Error('Custom resize not implemented yet');
  }

  const fileSize = await VideoUtils.getFileSize(resultPath);
  
  return {
    outputPath: resultPath,
    platform: platform,
    dimensions: platform ? ffmpegService.getPlatformSpecs(platform) : { width, height },
    fileSize: fileSize,
    formattedFileSize: VideoUtils.formatFileSize(fileSize)
  };
}

async function handleExtractAudio(inputPath, options, tempFiles) {
  const { format = 'mp3', quality = 2 } = options;
  
  const outputFilename = VideoUtils.generateUniqueFilename(`extracted-audio.${format}`, 'audio-');
  const outputPath = join(process.cwd(), 'temp', outputFilename);
  tempFiles.push(outputPath);

  const resultPath = await ffmpegService.extractAudio(inputPath, outputPath, {
    codec: format,
    quality: quality
  });

  const fileSize = await VideoUtils.getFileSize(resultPath);
  
  return {
    outputPath: resultPath,
    format: format,
    quality: quality,
    fileSize: fileSize,
    formattedFileSize: VideoUtils.formatFileSize(fileSize)
  };
}

async function handleAddSubtitles(inputPath, formData, options, tempFiles) {
  const subtitleFile = formData.get('subtitleFile');
  
  if (!subtitleFile) {
    throw new Error('Subtitle file is required for add-subtitles operation');
  }

  // Save subtitle file
  const subtitleBytes = await subtitleFile.arrayBuffer();
  const subtitleBuffer = Buffer.from(subtitleBytes);
  const subtitlePath = join(process.cwd(), 'temp', `subtitle-${Date.now()}-${subtitleFile.name}`);
  await writeFile(subtitlePath, subtitleBuffer);
  tempFiles.push(subtitlePath);

  // Validate subtitle file
  const validation = await subtitleService.validateSubtitleFile(subtitlePath);
  if (!validation.isValid) {
    throw new Error(`Invalid subtitle file: ${validation.error}`);
  }

  const outputFilename = VideoUtils.generateUniqueFilename('video-with-subs.mp4', 'subs-');
  const outputPath = join(process.cwd(), 'temp', outputFilename);
  tempFiles.push(outputPath);

  const resultPath = await ffmpegService.addSubtitles(
    inputPath,
    subtitlePath,
    outputPath,
    options
  );

  const fileSize = await VideoUtils.getFileSize(resultPath);
  
  return {
    outputPath: resultPath,
    subtitleInfo: validation,
    fileSize: fileSize,
    formattedFileSize: VideoUtils.formatFileSize(fileSize)
  };
}

async function handleCreateThumbnail(inputPath, options, tempFiles) {
  const { timeOffset = 5, size = '320x240' } = options;
  
  const outputFilename = VideoUtils.generateUniqueFilename('thumbnail.jpg', 'thumb-');
  const outputPath = join(process.cwd(), 'temp', outputFilename);
  tempFiles.push(outputPath);

  const resultPath = await ffmpegService.createThumbnail(
    inputPath,
    outputPath,
    timeOffset,
    { size }
  );

  const fileSize = await VideoUtils.getFileSize(resultPath);
  
  return {
    outputPath: resultPath,
    timeOffset: timeOffset,
    size: size,
    fileSize: fileSize,
    formattedFileSize: VideoUtils.formatFileSize(fileSize)
  };
}

export async function GET(request) {
  try {
    // Health check for FFmpeg service
    const isHealthy = await ffmpegService.healthCheck();
    
    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        service: 'FFmpeg Video Processing',
        supportedOperations: ['metadata', 'cut', 'resize', 'extract-audio', 'add-subtitles', 'thumbnail'],
        platformSpecs: {
          tiktok: ffmpegService.getPlatformSpecs('tiktok'),
          instagram: ffmpegService.getPlatformSpecs('instagram'),
          youtube: ffmpegService.getPlatformSpecs('youtube'),
          twitter: ffmpegService.getPlatformSpecs('twitter')
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: 'FFmpeg Video Processing',
          error: 'FFmpeg not available'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'FFmpeg Video Processing',
        error: error.message
      },
      { status: 500 }
    );
  }
}