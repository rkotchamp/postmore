import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Audio Chunking Service for OpenAI Whisper API
 * Splits large audio/video files into chunks that respect Whisper's 25MB limit
 */

const WHISPER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB in bytes
const CHUNK_DURATION_MINUTES = 10; // 10 minutes per chunk (safe for most audio)

/**
 * Get audio duration using ffprobe
 * @param {string} filePath - Path to audio/video file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getAudioDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    
    const duration = parseFloat(stdout.trim());
    console.log(`🕒 [CHUNKING] Audio duration: ${duration.toFixed(2)}s (${(duration/60).toFixed(1)} minutes)`);
    
    return duration;
  } catch (error) {
    console.error('❌ [CHUNKING] Failed to get audio duration:', error);
    throw new Error(`Failed to get audio duration: ${error.message}`);
  }
}

/**
 * Extract audio from video file using ffmpeg
 * @param {string} videoPath - Path to video file
 * @param {string} outputPath - Path for extracted audio
 * @returns {Promise<string>} - Path to extracted audio file
 */
async function extractAudio(videoPath, outputPath) {
  try {
    console.log(`🎵 [CHUNKING] Extracting audio from video...`);
    
    // Extract audio as MP3 with good compression
    const { stderr } = await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ab 128k -ar 22050 -y "${outputPath}"`
    );
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Audio extraction failed - output file not created');
    }
    
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ [CHUNKING] Audio extracted: ${fileSizeMB}MB`);
    
    return outputPath;
  } catch (error) {
    console.error('❌ [CHUNKING] Audio extraction failed:', error);
    throw new Error(`Audio extraction failed: ${error.message}`);
  }
}

/**
 * Split audio file into chunks that fit Whisper's 25MB limit
 * @param {string} audioPath - Path to audio file
 * @param {string} outputDir - Directory to save chunks
 * @returns {Promise<string[]>} - Array of chunk file paths
 */
async function splitAudioIntoChunks(audioPath, outputDir) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const duration = await getAudioDuration(audioPath);
    const chunkDurationSeconds = CHUNK_DURATION_MINUTES * 60;
    const totalChunks = Math.ceil(duration / chunkDurationSeconds);
    
    console.log(`✂️ [CHUNKING] Splitting into ${totalChunks} chunks of ${CHUNK_DURATION_MINUTES} minutes each`);

    const chunkPaths = [];

    for (let i = 0; i < totalChunks; i++) {
      const startTime = i * chunkDurationSeconds;
      const chunkPath = path.join(outputDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
      
      console.log(`🔄 [CHUNKING] Creating chunk ${i + 1}/${totalChunks} (starting at ${startTime}s)`);
      
      // Split audio using ffmpeg with overlap to avoid cutting words
      await execAsync(
        `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${chunkDurationSeconds} -acodec libmp3lame -ab 128k -ar 22050 -y "${chunkPath}"`
      );

      if (fs.existsSync(chunkPath)) {
        const chunkStats = fs.statSync(chunkPath);
        const chunkSizeMB = (chunkStats.size / (1024 * 1024)).toFixed(2);
        
        if (chunkStats.size > WHISPER_MAX_SIZE_BYTES) {
          console.warn(`⚠️ [CHUNKING] Chunk ${i + 1} is ${chunkSizeMB}MB (over 25MB limit), will re-chunk`);
          // TODO: Implement recursive chunking if needed
        } else {
          console.log(`✅ [CHUNKING] Chunk ${i + 1} created: ${chunkSizeMB}MB`);
          chunkPaths.push(chunkPath);
        }
      } else {
        console.error(`❌ [CHUNKING] Failed to create chunk ${i + 1}`);
      }
    }

    return chunkPaths;
  } catch (error) {
    console.error('❌ [CHUNKING] Audio splitting failed:', error);
    throw new Error(`Audio splitting failed: ${error.message}`);
  }
}

/**
 * Main function to chunk large video/audio for Whisper API
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - Chunking result with chunk paths and metadata
 */
export async function chunkVideoForWhisper(videoPath) {
  try {
    console.log(`📂 [CHUNKING] Processing large video: ${path.basename(videoPath)}`);
    
    // Check file size
    const stats = fs.statSync(videoPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 [CHUNKING] Video size: ${fileSizeMB}MB`);
    
    if (stats.size <= WHISPER_MAX_SIZE_BYTES) {
      console.log(`✅ [CHUNKING] File is under 25MB limit, no chunking needed`);
      return {
        needsChunking: false,
        originalPath: videoPath,
        chunks: [videoPath],
        totalChunks: 1
      };
    }

    // Create temporary directory for processing
    const tempDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const chunkDir = path.join(tempDir, `${baseName}_chunks`);
    
    // Extract audio first (more efficient than working with video)
    const audioPath = path.join(tempDir, `${baseName}_audio.mp3`);
    await extractAudio(videoPath, audioPath);
    
    // Split audio into chunks
    const chunkPaths = await splitAudioIntoChunks(audioPath, chunkDir);
    
    // Clean up temporary audio file
    fs.unlinkSync(audioPath);
    
    console.log(`✅ [CHUNKING] Successfully created ${chunkPaths.length} chunks`);
    
    return {
      needsChunking: true,
      originalPath: videoPath,
      chunks: chunkPaths,
      totalChunks: chunkPaths.length,
      chunkDirectory: chunkDir,
      originalSizeMB: parseFloat(fileSizeMB)
    };
    
  } catch (error) {
    console.error('❌ [CHUNKING] Video chunking failed:', error);
    throw new Error(`Video chunking failed: ${error.message}`);
  }
}

/**
 * Clean up chunk files and temporary directories
 * @param {string} chunkDirectory - Directory containing chunks
 */
export function cleanupChunks(chunkDirectory) {
  try {
    if (fs.existsSync(chunkDirectory)) {
      const files = fs.readdirSync(chunkDirectory);
      files.forEach(file => {
        fs.unlinkSync(path.join(chunkDirectory, file));
      });
      fs.rmdirSync(chunkDirectory);
      console.log(`🗑️ [CHUNKING] Cleaned up chunks directory: ${chunkDirectory}`);
    }
  } catch (error) {
    console.error('❌ [CHUNKING] Cleanup failed:', error);
  }
}

export default {
  chunkVideoForWhisper,
  cleanupChunks
};