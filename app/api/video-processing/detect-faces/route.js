/**
 * Face Detection API Route
 * Handles face detection for smart video cropping using OpenCV
 */

import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import FaceDetectionService from '@/app/lib/video-processing/services/faceDetectionService';
import VideoUtils from '@/app/lib/video-processing/utils/videoUtils';

const faceDetectionService = new FaceDetectionService();

export async function POST(request) {
  let tempFiles = [];
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const operation = formData.get('operation') || 'detect'; // 'detect', 'video-analysis', 'crop-region'
    const options = JSON.parse(formData.get('options') || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if face detection is available
    if (!faceDetectionService.healthCheck()) {
      return NextResponse.json(
        { 
          error: 'Face detection service not available',
          details: 'OpenCV4nodejs not installed or configured properly'
        },
        { status: 503 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const inputPath = join(process.cwd(), 'temp', `face-detection-${Date.now()}-${file.name}`);
    VideoUtils.ensureDirectoryExists(join(process.cwd(), 'temp'));
    await writeFile(inputPath, buffer);
    tempFiles.push(inputPath);

    let result;
    
    switch (operation) {
      case 'detect':
        result = await handleImageFaceDetection(inputPath, options);
        break;
      case 'video-analysis':
        result = await handleVideoFaceAnalysis(inputPath, options, tempFiles);
        break;
      case 'crop-region':
        result = await handleCalculateCropRegion(inputPath, options, tempFiles);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return NextResponse.json({
      success: true,
      operation: operation,
      result: result,
      serviceInfo: faceDetectionService.getCapabilities(),
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Face detection error:', error);
    
    return NextResponse.json(
      { 
        error: 'Face detection failed',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    await VideoUtils.cleanupFiles(tempFiles);
  }
}

async function handleImageFaceDetection(inputPath, options) {
  // Validate that it's an image file
  if (!VideoUtils.isValidImageFormat(inputPath)) {
    throw new Error('File must be an image for face detection');
  }

  const faces = await faceDetectionService.detectFacesInImage(inputPath);
  
  return {
    facesDetected: faces.length,
    faces: faces,
    imageProcessed: true,
    confidence: faces.length > 0 ? 'high' : 'none'
  };
}

async function handleVideoFaceAnalysis(inputPath, options, tempFiles) {
  // Validate that it's a video file
  if (!VideoUtils.isValidVideoFormat(inputPath)) {
    throw new Error('File must be a video for video face analysis');
  }

  const analysisOptions = {
    sampleInterval: options.sampleInterval || 30, // Sample every 30 frames (1 second at 30fps)
    maxSamples: options.maxSamples || 10,
    ...options
  };

  const faceResults = await faceDetectionService.detectFacesInVideo(inputPath, analysisOptions);
  
  // Calculate statistics
  const totalFaces = faceResults.reduce((sum, result) => sum + result.faces.length, 0);
  const framesWithFaces = faceResults.filter(result => result.faces.length > 0).length;
  const faceDetectionRate = framesWithFaces / faceResults.length;
  
  // Find most common face positions (for consistent framing)
  const allFaces = faceResults.flatMap(result => result.faces);
  const averageFacePosition = allFaces.length > 0 ? {
    centerX: allFaces.reduce((sum, face) => sum + face.centerX, 0) / allFaces.length,
    centerY: allFaces.reduce((sum, face) => sum + face.centerY, 0) / allFaces.length,
    averageWidth: allFaces.reduce((sum, face) => sum + face.width, 0) / allFaces.length,
    averageHeight: allFaces.reduce((sum, face) => sum + face.height, 0) / allFaces.length
  } : null;

  return {
    samplesAnalyzed: faceResults.length,
    totalFacesDetected: totalFaces,
    framesWithFaces: framesWithFaces,
    faceDetectionRate: Math.round(faceDetectionRate * 100),
    averageFacesPerFrame: totalFaces / faceResults.length,
    averageFacePosition: averageFacePosition,
    timeline: faceResults.map(result => ({
      timestamp: result.timestamp,
      facesCount: result.faces.length,
      hasMainSubject: result.faces.length === 1
    })),
    recommendation: {
      useFaceDetection: faceDetectionRate > 0.3, // If faces detected in >30% of frames
      confidence: faceDetectionRate > 0.5 ? 'high' : faceDetectionRate > 0.2 ? 'medium' : 'low'
    }
  };
}

async function handleCalculateCropRegion(inputPath, options, tempFiles) {
  const { targetPlatform = 'tiktok', videoInfo } = options;
  
  if (!VideoUtils.isValidVideoFormat(inputPath)) {
    throw new Error('File must be a video for crop region calculation');
  }

  if (!videoInfo || !videoInfo.width || !videoInfo.height) {
    throw new Error('Video dimensions (width/height) must be provided in videoInfo');
  }

  // Analyze faces in the video
  const faceResults = await faceDetectionService.detectFacesInVideo(inputPath, {
    sampleInterval: options.sampleInterval || 60, // Sample every 2 seconds
    maxSamples: options.maxSamples || 5
  });

  // Get target platform specifications
  const platformSpecs = VideoUtils.getPlatformConstraints(targetPlatform);
  const targetSpecs = {
    width: platformSpecs.maxWidth || 720,
    height: platformSpecs.maxHeight || 1280
  };

  // Calculate optimal crop region
  const cropRegion = faceDetectionService.calculateOptimalCrop(
    faceResults,
    videoInfo,
    targetSpecs
  );

  // Calculate crop statistics
  const originalArea = videoInfo.width * videoInfo.height;
  const cropArea = cropRegion.width * cropRegion.height;
  const retainedArea = (cropArea / originalArea) * 100;

  return {
    cropRegion: cropRegion,
    targetPlatform: targetPlatform,
    targetSpecs: targetSpecs,
    originalDimensions: {
      width: videoInfo.width,
      height: videoInfo.height
    },
    statistics: {
      facesDetected: faceResults.reduce((sum, result) => sum + result.faces.length, 0),
      samplesAnalyzed: faceResults.length,
      retainedArea: Math.round(retainedArea),
      cropRatio: `${Math.round((cropRegion.width / videoInfo.width) * 100)}% width, ${Math.round((cropRegion.height / videoInfo.height) * 100)}% height`
    },
    ffmpegFilter: `crop=${cropRegion.width}:${cropRegion.height}:${cropRegion.x}:${cropRegion.y}`,
    recommendation: {
      useSmartCrop: faceResults.some(result => result.faces.length > 0),
      quality: retainedArea > 70 ? 'excellent' : retainedArea > 50 ? 'good' : retainedArea > 30 ? 'acceptable' : 'poor'
    }
  };
}

export async function GET(request) {
  try {
    // Get service capabilities and health status
    const isHealthy = faceDetectionService.healthCheck();
    const capabilities = faceDetectionService.getCapabilities();
    
    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        service: 'Face Detection (OpenCV)',
        capabilities: capabilities,
        supportedOperations: ['detect', 'video-analysis', 'crop-region'],
        supportedFormats: {
          images: VideoUtils.supportedImageFormats,
          videos: VideoUtils.supportedVideoFormats
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'unavailable',
        service: 'Face Detection (OpenCV)',
        capabilities: capabilities,
        reason: 'OpenCV4nodejs not installed or configured',
        fallback: 'Center crop will be used instead',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'Face Detection (OpenCV)',
        error: error.message
      },
      { status: 500 }
    );
  }
}