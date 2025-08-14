/**
 * Hugging Face Whisper Service
 * Handles speech-to-text transcription using your hosted Whisper model via Gradio API
 */

class HuggingFaceWhisperService {
  constructor() {
    this.spaceName = process.env.HUGGINGFACE_SPACE_NAME || 'rkotChamp/postmoore';
    this.apiToken = process.env.HUGGINGFACE_API_TOKEN;
    this.gradioClient = null;
  }

  /**
   * Initialize Gradio client
   * @returns {Promise<void>}
   */
  async initializeClient() {
    if (this.gradioClient) return;

    try {
      // Import Gradio client dynamically
      const { Client } = await import('@gradio/client');
      
      // Connect to your Hugging Face Space
      this.gradioClient = await Client.connect(this.spaceName, {
        hf_token: this.apiToken // Pass token if needed for private spaces
      });
      
      console.log('Connected to Hugging Face Gradio space:', this.spaceName);
    } catch (error) {
      console.error('Failed to initialize Gradio client:', error);
      throw new Error(`Failed to connect to Hugging Face space: ${error.message}`);
    }
  }

  /**
   * Transcribe audio/video file to text using Gradio API
   * @param {Buffer|string} audioData - Audio file buffer or file path
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result with text and timestamps
   */
  async transcribe(audioData, options = {}) {
    try {
      await this.initializeClient();

      // Prepare audio file for Gradio
      let audioFile;
      if (Buffer.isBuffer(audioData)) {
        // If it's a buffer, we need to save it temporarily and pass the path
        const fs = require('fs');
        const path = require('path');
        const tempPath = path.join(process.cwd(), 'temp', `temp-audio-${Date.now()}.wav`);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(tempPath, audioData);
        audioFile = tempPath;
      } else if (typeof audioData === 'string') {
        // Assume it's a file path
        audioFile = audioData;
      } else {
        throw new Error('audioData must be a Buffer or file path string');
      }

      // Call the /predict endpoint with audio_file parameter
      const result = await this.gradioClient.predict("/predict", {
        audio_file: audioFile
      });

      // Clean up temporary file if we created one
      if (Buffer.isBuffer(audioData)) {
        const fs = require('fs');
        try {
          fs.unlinkSync(audioFile);
        } catch (err) {
          console.warn('Failed to cleanup temp file:', err.message);
        }
      }

      return this.formatTranscriptionResult(result);
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Transcribe from file path
   * @param {string} filePath - Path to audio/video file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFromFile(filePath, options = {}) {
    const fs = require('fs');
    
    try {
      const audioBuffer = fs.readFileSync(filePath);
      return await this.transcribe(audioBuffer, options);
    } catch (error) {
      throw new Error(`Failed to transcribe file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Format the transcription result to standardized format
   * @param {Object} result - Raw result from Hugging Face API
   * @returns {Object} Formatted transcription result
   */
  formatTranscriptionResult(result) {
    // This will need to be adjusted based on your actual API response format
    return {
      text: result.text || result.transcription || '',
      segments: result.segments || [],
      language: result.language || 'unknown',
      confidence: result.confidence || null,
      duration: result.duration || null,
      timestamps: result.timestamps || []
    };
  }

  /**
   * Extract audio segments based on timestamps
   * @param {Object} transcription - Transcription result with timestamps
   * @param {number} minSegmentLength - Minimum segment length in seconds
   * @returns {Array} Array of text segments with timestamps
   */
  extractSegments(transcription, minSegmentLength = 30) {
    const segments = [];
    let currentSegment = {
      text: '',
      startTime: 0,
      endTime: 0
    };

    transcription.segments?.forEach((segment, index) => {
      const segmentDuration = segment.end - segment.start;
      
      if (segmentDuration >= minSegmentLength || index === transcription.segments.length - 1) {
        segments.push({
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          duration: segmentDuration
        });
      }
    });

    return segments;
  }

  /**
   * Health check for the Hugging Face Gradio API
   * @returns {Promise<boolean>} API health status
   */
  async healthCheck() {
    try {
      await this.initializeClient();
      return this.gradioClient !== null;
    } catch (error) {
      console.error('Hugging Face Gradio API health check failed:', error);
      return false;
    }
  }
}

module.exports = HuggingFaceWhisperService;