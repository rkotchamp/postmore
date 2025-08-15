import fs from 'fs';
import path from 'path';

/**
 * Video Transcription Service
 * Handles speech-to-text transcription for video files using existing Hugging Face Whisper service
 */

// Import the existing Hugging Face Whisper service
const HuggingFaceWhisperService = require('./huggingfaceWhisperService');

const whisperService = new HuggingFaceWhisperService();

/**
 * Extract audio from video file using FFmpeg
 */
const extractAudioFromVideo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const audioPath = videoPath.replace(path.extname(videoPath), '_audio.wav');

    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-q:a', '0',
      '-map', 'a',
      '-f', 'wav',
      '-y',
      audioPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process failed: ${error.message}`));
    });
  });
};

/**
 * Transcribe video file to text with timestamps
 */
export const transcribeVideo = async (videoPath, options = {}) => {
  try {
    // Extract audio from video
    const audioPath = await extractAudioFromVideo(videoPath);

    try {
      // Use existing Hugging Face Whisper service
      const result = await whisperService.transcribeFromFile(audioPath, options);

      // Clean up audio file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }

      return result;
    } catch (error) {
      // Clean up audio file on error
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      throw error;
    }
  } catch (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Format transcription result
 */
const formatTranscriptionResult = (result) => {
  return {
    text: result.text || result.transcription || '',
    segments: result.segments || [],
    language: result.language || 'unknown',
    confidence: result.confidence || null,
    duration: result.duration || null,
    timestamps: result.timestamps || []
  };
};

/**
 * Extract meaningful segments from transcription
 */
export const extractSegments = (transcription, options = {}) => {
  const {
    minSegmentLength = 30,
    maxSegmentLength = 120,
    overlapSeconds = 5
  } = options;

  const segments = [];
  const allText = transcription.text;
  
  if (!transcription.segments || transcription.segments.length === 0) {
    // If no detailed segments, create basic ones
    const words = allText.split(' ');
    const wordsPerSegment = Math.ceil(words.length / Math.ceil(transcription.duration / minSegmentLength));
    
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentWords = words.slice(i, i + wordsPerSegment);
      const startTime = (i / words.length) * transcription.duration;
      const endTime = Math.min(((i + wordsPerSegment) / words.length) * transcription.duration, transcription.duration);
      
      segments.push({
        text: segmentWords.join(' '),
        startTime: Math.max(0, startTime),
        endTime: endTime,
        duration: endTime - startTime,
        confidence: transcription.confidence || 0.8
      });
    }
  } else {
    // Use detailed segments from Whisper
    transcription.segments.forEach((segment) => {
      if (segment.end - segment.start >= minSegmentLength / 2) {
        segments.push({
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          duration: segment.end - segment.start,
          confidence: segment.confidence || 0.8
        });
      }
    });
  }

  return segments;
};

/**
 * Get transcript with word-level timestamps
 */
export const getDetailedTranscript = async (videoPath) => {
  const transcription = await transcribeVideo(videoPath);
  const segments = extractSegments(transcription);
  
  return {
    fullText: transcription.text,
    segments: segments,
    duration: transcription.duration,
    language: transcription.language,
    wordCount: transcription.text.split(' ').length
  };
};

/**
 * Health check for transcription service
 */
export const healthCheck = async () => {
  try {
    return await whisperService.healthCheck();
  } catch (error) {
    return false;
  }
};