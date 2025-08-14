/**
 * Video Processing Utilities
 * Common utilities for video format validation and processing helpers
 */

const path = require('path');
const fs = require('fs');

class VideoUtils {
  static supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
  static supportedAudioFormats = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
  static supportedImageFormats = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];

  /**
   * Validate video file format
   * @param {string} filename - File name to validate
   * @returns {boolean} Is valid video format
   */
  static isValidVideoFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedVideoFormats.includes(ext);
  }

  /**
   * Validate audio file format
   * @param {string} filename - File name to validate
   * @returns {boolean} Is valid audio format
   */
  static isValidAudioFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedAudioFormats.includes(ext);
  }

  /**
   * Validate image file format
   * @param {string} filename - File name to validate
   * @returns {boolean} Is valid image format
   */
  static isValidImageFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedImageFormats.includes(ext);
  }

  /**
   * Get file size in bytes
   * @param {string} filePath - Path to file
   * @returns {Promise<number>} File size in bytes
   */
  static async getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * Format file size to human readable string
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration in seconds to readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration string
   */
  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Generate unique filename
   * @param {string} originalName - Original filename
   * @param {string} prefix - Optional prefix
   * @returns {string} Unique filename
   */
  static generateUniqueFilename(originalName, prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    
    return `${prefix}${timestamp}-${random}-${baseName}${ext}`;
  }

  /**
   * Sanitize filename for filesystem
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  static sanitizeFilename(filename) {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Validate video processing constraints
   * @param {Object} metadata - Video metadata
   * @param {Object} constraints - Processing constraints
   * @returns {Object} Validation result
   */
  static validateProcessingConstraints(metadata, constraints = {}) {
    const issues = [];
    
    // Check file size
    if (constraints.maxFileSize && metadata.filesize > constraints.maxFileSize) {
      issues.push(`File size ${this.formatFileSize(metadata.filesize)} exceeds maximum ${this.formatFileSize(constraints.maxFileSize)}`);
    }

    // Check duration
    if (constraints.maxDuration && metadata.duration > constraints.maxDuration) {
      issues.push(`Duration ${this.formatDuration(metadata.duration)} exceeds maximum ${this.formatDuration(constraints.maxDuration)}`);
    }

    if (constraints.minDuration && metadata.duration < constraints.minDuration) {
      issues.push(`Duration ${this.formatDuration(metadata.duration)} is below minimum ${this.formatDuration(constraints.minDuration)}`);
    }

    // Check resolution
    if (constraints.maxWidth && metadata.width > constraints.maxWidth) {
      issues.push(`Width ${metadata.width}px exceeds maximum ${constraints.maxWidth}px`);
    }

    if (constraints.maxHeight && metadata.height > constraints.maxHeight) {
      issues.push(`Height ${metadata.height}px exceeds maximum ${constraints.maxHeight}px`);
    }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Calculate video quality score
   * @param {Object} metadata - Video metadata
   * @returns {number} Quality score (0-100)
   */
  static calculateQualityScore(metadata) {
    let score = 0;

    // Resolution scoring (0-40 points)
    const pixelCount = (metadata.width || 0) * (metadata.height || 0);
    if (pixelCount >= 2073600) score += 40; // 1920x1080 or higher
    else if (pixelCount >= 921600) score += 30; // 1280x720
    else if (pixelCount >= 307200) score += 20; // 640x480
    else score += 10;

    // Frame rate scoring (0-20 points)
    const fps = metadata.fps || 0;
    if (fps >= 60) score += 20;
    else if (fps >= 30) score += 15;
    else if (fps >= 24) score += 10;
    else score += 5;

    // Duration scoring (0-20 points)
    const duration = metadata.duration || 0;
    if (duration >= 60 && duration <= 600) score += 20; // 1-10 minutes
    else if (duration >= 30 && duration <= 1800) score += 15; // 30s-30m
    else if (duration >= 10) score += 10; // 10s+
    else score += 5;

    // Bitrate scoring (0-20 points)
    const bitrate = metadata.bitrate || 0;
    if (bitrate >= 5000000) score += 20; // 5 Mbps+
    else if (bitrate >= 2000000) score += 15; // 2 Mbps+
    else if (bitrate >= 1000000) score += 10; // 1 Mbps+
    else score += 5;

    return Math.min(100, score);
  }

  /**
   * Extract timestamp from video segment
   * @param {string} segmentText - Segment text with possible timestamp
   * @returns {Object|null} Extracted timestamp info
   */
  static extractTimestamp(segmentText) {
    // Match various timestamp formats
    const patterns = [
      /(\d{1,2}):(\d{2}):(\d{2})/g, // HH:MM:SS
      /(\d{1,2}):(\d{2})/g, // MM:SS
      /(\d+)m(\d+)s/g, // XmYs
      /(\d+)min(\d+)sec/g, // XminYsec
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(segmentText);
      if (match) {
        let totalSeconds = 0;
        
        if (match.length === 4) { // HH:MM:SS
          totalSeconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
        } else if (match.length === 3) { // MM:SS or XmYs
          totalSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
        }

        return {
          originalText: match[0],
          totalSeconds: totalSeconds,
          formatted: this.formatDuration(totalSeconds)
        };
      }
    }

    return null;
  }

  /**
   * Clean up temporary files
   * @param {Array<string>} filePaths - Array of file paths to clean up
   */
  static async cleanupFiles(filePaths) {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error.message);
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Get platform-specific video constraints
   * @param {string} platform - Platform name
   * @returns {Object} Platform constraints
   */
  static getPlatformConstraints(platform) {
    const constraints = {
      tiktok: {
        maxDuration: 180, // 3 minutes
        minDuration: 3, // 3 seconds
        maxFileSize: 287762944, // 274.5 MB
        aspectRatio: '9:16',
        maxWidth: 1080,
        maxHeight: 1920
      },
      instagram: {
        maxDuration: 90, // 1.5 minutes for reels
        minDuration: 3,
        maxFileSize: 104857600, // 100 MB
        aspectRatio: '9:16',
        maxWidth: 1080,
        maxHeight: 1920
      },
      youtube: {
        maxDuration: 60, // 1 minute for Shorts
        minDuration: 3,
        maxFileSize: 2147483648, // 2 GB
        aspectRatio: '9:16',
        maxWidth: 1080,
        maxHeight: 1920
      },
      twitter: {
        maxDuration: 140, // 2 minutes 20 seconds
        minDuration: 1,
        maxFileSize: 536870912, // 512 MB
        aspectRatio: '16:9', // Twitter supports both
        maxWidth: 1920,
        maxHeight: 1080
      }
    };

    return constraints[platform] || constraints.tiktok;
  }

  /**
   * Check if file exists and is readable
   * @param {string} filePath - File path to check
   * @returns {boolean} File exists and is readable
   */
  static isFileAccessible(filePath) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create temporary directory for processing
   * @param {string} prefix - Directory prefix
   * @returns {string} Temporary directory path
   */
  static createTempDirectory(prefix = 'video-processing') {
    const tempDir = path.join(process.cwd(), 'temp', `${prefix}-${Date.now()}`);
    this.ensureDirectoryExists(tempDir);
    return tempDir;
  }
}

module.exports = VideoUtils;