/**
 * Video Transcription API Route
 * Handles audio/video transcription using Hugging Face Whisper
 */

import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import HuggingFaceWhisperService from '@/app/lib/video-processing/services/huggingfaceWhisperService';
import VideoUtils from '@/app/lib/video-processing/utils/videoUtils';

const whisperService = new HuggingFaceWhisperService();

export async function POST(request) {
  let tempFilePath = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const options = JSON.parse(formData.get('options') || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file format
    if (!VideoUtils.isValidVideoFormat(file.name) && !VideoUtils.isValidAudioFormat(file.name)) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a video or audio file.' },
        { status: 400 }
      );
    }

    // Check file size (limit to 100MB for transcription)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${VideoUtils.formatFileSize(maxSize)}` },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    tempFilePath = join(process.cwd(), 'temp', `transcribe-${Date.now()}-${file.name}`);
    VideoUtils.ensureDirectoryExists(join(process.cwd(), 'temp'));
    await writeFile(tempFilePath, buffer);

    // Transcribe the file
    const transcriptionResult = await whisperService.transcribeFromFile(tempFilePath, {
      includeTimestamps: options.includeTimestamps !== false,
      language: options.language || 'auto',
      ...options
    });

    // Extract segments for clip detection if requested
    let segments = [];
    if (options.extractSegments) {
      segments = whisperService.extractSegments(
        transcriptionResult,
        options.minSegmentLength || 30
      );
    }

    const response = {
      success: true,
      transcription: transcriptionResult,
      segments: segments,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        duration: transcriptionResult.duration,
        language: transcriptionResult.language,
        processedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Transcription error:', error);
    
    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temp file:', error.message);
      }
    }
  }
}

export async function GET(request) {
  try {
    // Health check endpoint
    const isHealthy = await whisperService.healthCheck();
    
    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        service: 'Hugging Face Whisper',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: 'Hugging Face Whisper',
          error: 'Service not responding'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'Hugging Face Whisper',
        error: error.message
      },
      { status: 500 }
    );
  }
}