import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { chunkVideoForWhisper, cleanupChunks } from './audioChunkingService.js';

// Create HTTPS agent with better SSL/TLS configuration
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  secureProtocol: 'TLSv1_2_method', // Force TLS 1.2
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'DHE-RSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256'
  ].join(':'),
  rejectUnauthorized: true,
  ecdhCurve: 'auto', // Let OpenSSL choose the best curve
});

// Initialize OpenAI client with proper timeout and retry configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 300000, // 5 minutes timeout for large audio files
  maxRetries: 3, // Retry up to 3 times on network errors
  httpAgent: httpsAgent
});

/**
 * Transcribe large audio/video file with automatic chunking for files > 25MB
 * @param {string} filePath - Path to audio/video file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Combined transcription result with timestamps
 */
export async function transcribeWithWhisper(filePath, options = {}) {
  try {
    // Check if file needs chunking
    const chunkResult = await chunkVideoForWhisper(filePath);
    
    if (!chunkResult.needsChunking) {
      // File is small enough, use original transcription method
      return await transcribeSingleFile(filePath, options);
    }

    console.log(`📂 [WHISPER] Large file detected (${chunkResult.originalSizeMB}MB), processing ${chunkResult.totalChunks} chunks`);
    
    // Transcribe all chunks
    const chunkTranscriptions = [];
    let totalCost = 0;
    let totalProcessingTime = 0;
    let cumulativeTime = 0;

    for (let i = 0; i < chunkResult.chunks.length; i++) {
      const chunkPath = chunkResult.chunks[i];
      console.log(`🔄 [WHISPER] Processing chunk ${i + 1}/${chunkResult.totalChunks}`);
      
      const chunkTranscription = await transcribeSingleFile(chunkPath, options);
      
      // Adjust timestamps for this chunk (add cumulative time offset)
      let chunkDuration = 0;
      if (chunkTranscription.segments) {
        chunkTranscription.segments.forEach(segment => {
          segment.start += cumulativeTime;
          segment.end += cumulativeTime;
        });
        
        // Calculate actual chunk duration from transcription
        if (chunkTranscription.segments.length > 0) {
          const lastSegment = chunkTranscription.segments[chunkTranscription.segments.length - 1];
          chunkDuration = lastSegment.end - cumulativeTime;
          console.log(`📊 [WHISPER] Chunk ${i + 1} actual duration: ${chunkDuration.toFixed(1)}s`);
        }
      }
      
      // Also adjust word timestamps if present
      if (chunkTranscription.words) {
        chunkTranscription.words.forEach(word => {
          word.start += cumulativeTime;
          word.end += cumulativeTime;
        });
      }
      
      chunkTranscriptions.push(chunkTranscription);
      totalCost += chunkTranscription.estimatedCost || 0;
      totalProcessingTime += chunkTranscription.processingTime || 0;
      
      // Update cumulative time based on actual chunk duration, fallback to 10 minutes
      cumulativeTime += chunkDuration > 0 ? chunkDuration : (10 * 60);
    }

    // Combine all transcriptions
    const combinedText = chunkTranscriptions.map(t => t.text).join(' ');
    const combinedSegments = chunkTranscriptions.flatMap(t => t.segments || []);
    const combinedWords = chunkTranscriptions.flatMap(t => t.words || []);
    
    // Clean up chunk files
    if (chunkResult.chunkDirectory) {
      cleanupChunks(chunkResult.chunkDirectory);
    }

    console.log(`✅ [WHISPER] Completed chunked transcription: ${combinedSegments.length} segments, $${totalCost.toFixed(4)} total cost`);

    return {
      success: true,
      text: combinedText,
      language: chunkTranscriptions[0]?.language || 'unknown',
      duration: cumulativeTime,
      segments: combinedSegments,
      words: combinedWords,
      processingTime: totalProcessingTime,
      estimatedCost: totalCost,
      fileSizeMB: chunkResult.originalSizeMB,
      chunked: true,
      totalChunks: chunkResult.totalChunks
    };

  } catch (error) {
    console.error('❌ [WHISPER] Chunked transcription failed:', error);
    throw error;
  }
}

/**
 * Transcribe a single audio/video file using OpenAI Whisper (internal function)
 * @param {string} filePath - Path to audio/video file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Transcription result with timestamps
 */
async function transcribeSingleFile(filePath, options = {}) {
  const {
    language = null, // Auto-detect if null
    responseFormat = 'verbose_json', // Get timestamps
    temperature = 0, // Deterministic output
  } = options;

  try {
    console.log(`🎤 [WHISPER] Starting transcription for: ${path.basename(filePath)}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats for logging
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📁 [WHISPER] File size: ${fileSizeMB}MB`);

    // Calculate estimated cost (Whisper API: $0.006 per minute)
    // Rough estimate: 1MB ≈ 1 minute of audio
    const estimatedMinutes = Math.ceil(stats.size / (1024 * 1024));
    const estimatedCost = (estimatedMinutes * 0.006).toFixed(4);
    console.log(`💰 [WHISPER] Estimated cost: $${estimatedCost} (~${estimatedMinutes} minutes)`);

    // Create file stream
    const audioFile = fs.createReadStream(filePath);

    // Call Whisper API with retry logic
    const startTime = Date.now();
    // Create request parameters, only include language if it's not null
    const requestParams = {
      file: audioFile,
      model: 'whisper-1',
      response_format: responseFormat,
      temperature: temperature,
      // Enable word-level timestamps for caption timing
      timestamp_granularities: ['word', 'segment']
    };
    
    // Only add language if it's not null (OpenAI API auto-detects if omitted)
    if (language) {
      requestParams.language = language;
    }
    
    // Retry logic with exponential backoff for connection errors
    let transcription;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [WHISPER] Attempt ${attempt}/${maxRetries} - Calling OpenAI API...`);
        transcription = await openai.audio.transcriptions.create(requestParams);
        console.log(`✅ [WHISPER] API call successful on attempt ${attempt}`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain errors
        if (error.status === 400 || error.status === 401) {
          throw error; // Invalid request or auth - don't retry
        }
        
        // Log the error and potentially retry
        console.error(`❌ [WHISPER] Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Calculate exponential backoff delay (2^attempt seconds + jitter)
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          
          console.log(`⏳ [WHISPER] Waiting ${(delay/1000).toFixed(1)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Create a new file stream for retry (streams can only be consumed once)
          try {
            if (requestParams.file && typeof requestParams.file.destroy === 'function') {
              requestParams.file.destroy();
            }
          } catch (streamError) {
            // Ignore stream destruction errors
          }
          
          requestParams.file = fs.createReadStream(filePath);
        }
      }
    }
    
    // If we exhausted all retries, throw the last error
    if (!transcription) {
      throw lastError;
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⚡ [WHISPER] Processing completed in ${processingTime}s`);

    // Parse the response based on format
    if (responseFormat === 'verbose_json') {
      console.log(`📝 [WHISPER] Transcription complete: ${transcription.segments?.length || 0} segments`);
      console.log(`🔤 [WHISPER] Word-level timestamps: ${transcription.words?.length || 0} words`);
      
      // Log sample words for debugging captions
      if (transcription.words && transcription.words.length > 0) {
        console.log(`📋 [WHISPER] Sample words for caption timing:`);
        transcription.words.slice(0, 5).forEach(word => {
          console.log(`  "${word.word}" [${word.start}s - ${word.end}s]`);
        });
      }
      
      return {
        success: true,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments || [],
        words: transcription.words || [],
        processingTime: parseFloat(processingTime),
        estimatedCost: parseFloat(estimatedCost),
        fileSizeMB: parseFloat(fileSizeMB)
      };
    } else {
      // Simple text format
      return {
        success: true,
        text: transcription,
        processingTime: parseFloat(processingTime),
        estimatedCost: parseFloat(estimatedCost),
        fileSizeMB: parseFloat(fileSizeMB)
      };
    }

  } catch (error) {
    console.error('❌ [WHISPER] Transcription failed:', error);
    
    // Handle specific API errors
    if (error.status === 400) {
      throw new Error(`Invalid file format or size. Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25MB)`);
    } else if (error.status === 401) {
      throw new Error(`OpenAI API key invalid or missing. Check your OPENAI_API_KEY environment variable.`);
    } else if (error.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait and try again.`);
    } else if (error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504) {
      throw new Error(`OpenAI server error (${error.status}). Please try again later.`);
    }
    
    // Handle connection errors specifically
    if (error.message && (
      error.message.includes('EPROTO') || 
      error.message.includes('Connection error') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')
    )) {
      throw new Error(`Network connection error: ${error.message}. This may be due to SSL/TLS issues, network connectivity problems, or firewall restrictions. Please check your internet connection and try again.`);
    }
    
    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      throw new Error(`Request timeout: The transcription took too long to complete. This may happen with very large audio files. Please try with a smaller file or check your connection.`);
    }
    
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}

/**
 * Find interesting moments in transcription for highlight detection
 * @param {Object} transcription - Whisper transcription result
 * @param {Object} options - Analysis options
 * @returns {Array} - Array of interesting moments with timestamps
 */
export function findInterestingMoments(transcription, options = {}) {
  const {
    minSegmentLength = 2,    // Minimum segment length in seconds
    energyThreshold = 0.3,   // Energy level threshold
    emotionWords = ['wow', 'amazing', 'incredible', 'unbelievable', 'crazy', 'insane', 'epic'],
    questionWords = ['what', 'how', 'why', 'when', 'where', 'who'],
    exclamationThreshold = 0.1 // Percentage of exclamation marks
  } = options;

  if (!transcription.segments || transcription.segments.length === 0) {
    console.log('⚠️ [WHISPER] No segments found for moment analysis');
    return [];
  }

  const interestingMoments = [];

  transcription.segments.forEach((segment, index) => {
    const { start, end, text } = segment;
    const duration = end - start;
    
    // Skip very short segments
    if (duration < minSegmentLength) return;

    let interestScore = 0;
    const reasons = [];

    // Check for emotion words
    const lowerText = text.toLowerCase();
    const emotionMatches = emotionWords.filter(word => lowerText.includes(word));
    if (emotionMatches.length > 0) {
      interestScore += emotionMatches.length * 10;
      reasons.push(`emotion_words: ${emotionMatches.join(', ')}`);
    }

    // Check for questions (engagement indicator)
    const questionMatches = questionWords.filter(word => lowerText.includes(word));
    if (questionMatches.length > 0) {
      interestScore += questionMatches.length * 5;
      reasons.push(`questions: ${questionMatches.length}`);
    }

    // Check for exclamation marks (energy indicator)
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) {
      interestScore += exclamationCount * 8;
      reasons.push(`exclamations: ${exclamationCount}`);
    }

    // Check speech rate (fast speech often indicates excitement)
    const wordsPerSecond = text.split(' ').length / duration;
    if (wordsPerSecond > 3) { // Above average speaking rate
      interestScore += 5;
      reasons.push(`fast_speech: ${wordsPerSecond.toFixed(1)}wps`);
    }

    // Check for repeated words (emphasis)
    const words = text.toLowerCase().split(' ');
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 3) { // Ignore short words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    const repeatedWords = Object.entries(wordCounts).filter(([word, count]) => count > 1);
    if (repeatedWords.length > 0) {
      interestScore += repeatedWords.length * 3;
      reasons.push(`repeated_words: ${repeatedWords.length}`);
    }

    // Add moment if it passes threshold
    if (interestScore > 10) {
      interestingMoments.push({
        startTime: start,
        endTime: end,
        duration: duration,
        text: text.trim(),
        interestScore: interestScore,
        reasons: reasons,
        segmentIndex: index
      });
    }
  });

  // Sort by interest score (highest first)
  interestingMoments.sort((a, b) => b.interestScore - a.interestScore);

  console.log(`🎯 [WHISPER] Found ${interestingMoments.length} interesting moments`);
  
  return interestingMoments;
}

export default {
  transcribeWithWhisper,
  findInterestingMoments
};