/**
 * FFmpeg Service
 * Handles video processing, cutting, resizing, and format conversion using fluent-ffmpeg
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class FFmpegService {
  constructor() {
    // Set FFmpeg path if specified in environment
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  /**
   * Get video metadata
   * @param {string} inputPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Extract audio from video
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output audio file path
   * @param {Object} options - Audio extraction options
   * @returns {Promise<string>} Output file path
   */
  async extractAudio(inputPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .audioCodec(options.codec || 'mp3')
        .audioFrequency(options.frequency || 44100)
        .audioChannels(options.channels || 2);

      if (options.quality) {
        command = command.audioQuality(options.quality);
      }

      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Cut video segment
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output video file path
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Cutting options
   * @returns {Promise<string>} Output file path
   */
  async cutVideoSegment(inputPath, outputPath, startTime, duration, options = {}) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration);

      // Apply video options
      if (options.videoCodec) {
        command = command.videoCodec(options.videoCodec);
      }

      if (options.audioCodec) {
        command = command.audioCodec(options.audioCodec);
      }

      if (options.videoBitrate) {
        command = command.videoBitrate(options.videoBitrate);
      }

      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Video cutting failed: ${err.message}`)))
        .on('progress', (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        })
        .run();
    });
  }

  /**
   * Resize video for social media platforms
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output video file path
   * @param {string} platform - Target platform (tiktok, instagram, youtube, twitter)
   * @param {Object} options - Resize options
   * @returns {Promise<string>} Output file path
   */
  async resizeForPlatform(inputPath, outputPath, platform, options = {}) {
    const platformSpecs = this.getPlatformSpecs(platform);
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .size(`${platformSpecs.width}x${platformSpecs.height}`)
        .aspect(platformSpecs.aspectRatio)
        .videoCodec('libx264')
        .audioCodec('aac');

      // Apply platform-specific settings
      if (platformSpecs.maxDuration && !options.ignoreDuration) {
        command = command.duration(platformSpecs.maxDuration);
      }

      if (platformSpecs.videoBitrate) {
        command = command.videoBitrate(platformSpecs.videoBitrate);
      }

      // Add filters for cropping and scaling
      const filters = [];
      
      if (options.smartCrop) {
        // Add smart cropping filter (will be enhanced with face detection)
        filters.push({
          filter: 'crop',
          options: `${platformSpecs.width}:${platformSpecs.height}`
        });
      } else {
        // Standard scale and pad
        filters.push({
          filter: 'scale',
          options: `${platformSpecs.width}:${platformSpecs.height}:force_original_aspect_ratio=decrease`
        });
        filters.push({
          filter: 'pad',
          options: `${platformSpecs.width}:${platformSpecs.height}:(ow-iw)/2:(oh-ih)/2:black`
        });
      }

      if (filters.length > 0) {
        command = command.complexFilter(filters);
      }

      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Video resizing failed: ${err.message}`)))
        .on('progress', (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        })
        .run();
    });
  }

  /**
   * Add subtitles to video
   * @param {string} inputPath - Input video file path
   * @param {string} subtitlePath - Subtitle file path (.srt)
   * @param {string} outputPath - Output video file path
   * @param {Object} options - Subtitle options
   * @returns {Promise<string>} Output file path
   */
  async addSubtitles(inputPath, subtitlePath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const subtitleFilter = `subtitles=${subtitlePath}:force_style='FontSize=${options.fontSize || 24},PrimaryColour=${options.color || '&Hffffff'}'`;

      ffmpeg(inputPath)
        .videoFilters(subtitleFilter)
        .videoCodec('libx264')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Adding subtitles failed: ${err.message}`)))
        .on('progress', (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        })
        .run();
    });
  }

  /**
   * Create video thumbnail
   * @param {string} inputPath - Input video file path
   * @param {string} outputPath - Output image file path
   * @param {number} timeOffset - Time offset in seconds
   * @param {Object} options - Thumbnail options
   * @returns {Promise<string>} Output file path
   */
  async createThumbnail(inputPath, outputPath, timeOffset = 5, options = {}) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timeOffset)
        .frames(1)
        .size(options.size || '320x240')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Thumbnail creation failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Get platform specifications
   * @param {string} platform - Platform name
   * @returns {Object} Platform specifications
   */
  getPlatformSpecs(platform) {
    const specs = {
      tiktok: {
        width: 720,
        height: 1280,
        aspectRatio: '9:16',
        maxDuration: 180, // 3 minutes
        videoBitrate: '1000k'
      },
      instagram: {
        width: 720,
        height: 1280,
        aspectRatio: '9:16',
        maxDuration: 90, // 1.5 minutes
        videoBitrate: '1000k'
      },
      youtube: {
        width: 720,
        height: 1280,
        aspectRatio: '9:16',
        maxDuration: 60, // 1 minute for Shorts
        videoBitrate: '1500k'
      },
      twitter: {
        width: 720,
        height: 1280,
        aspectRatio: '9:16',
        maxDuration: 140, // 2 minutes 20 seconds
        videoBitrate: '1000k'
      }
    };

    return specs[platform] || specs.tiktok; // Default to TikTok specs
  }

  /**
   * Health check for FFmpeg
   * @returns {Promise<boolean>} FFmpeg availability
   */
  async healthCheck() {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        resolve(!err && formats);
      });
    });
  }
}

module.exports = FFmpegService;