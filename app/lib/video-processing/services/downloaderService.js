/**
 * Video Downloader Service
 * Handles video downloads from YouTube, Twitch, Kick, Rumble, Vimeo using yt-dlp
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class VideoDownloaderService {
  constructor() {
    this.ytDlpPath = process.env.YTDLP_PATH || 'yt-dlp';
    this.downloadDir = process.env.VIDEO_DOWNLOAD_DIR || path.join(process.cwd(), 'temp', 'downloads');
    
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * Download video from URL
   * @param {string} url - Video URL
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result with file path and metadata
   */
  async downloadVideo(url, options = {}) {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid video URL provided');
      }

      // Check if URL is supported
      const platform = this.detectPlatform(url);
      if (!platform) {
        throw new Error('Unsupported video platform');
      }

      const downloadOptions = this.buildDownloadOptions(options);
      const outputPath = path.join(this.downloadDir, `${Date.now()}-%(title)s.%(ext)s`);

      const result = await this.executeDownload(url, outputPath, downloadOptions);
      
      return {
        success: true,
        filePath: result.filePath,
        metadata: result.metadata,
        platform: platform,
        originalUrl: url
      };
    } catch (error) {
      console.error('Video download error:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Get video information without downloading
   * @param {string} url - Video URL
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        url
      ];

      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(output);
            resolve(this.formatMetadata(metadata));
          } catch (parseError) {
            reject(new Error(`Failed to parse video metadata: ${parseError.message}`));
          }
        } else {
          reject(new Error(`yt-dlp failed: ${error}`));
        }
      });
    });
  }

  /**
   * Execute the download process
   * @param {string} url - Video URL
   * @param {string} outputPath - Output file path template
   * @param {Array} options - yt-dlp options
   * @returns {Promise<Object>} Download result
   */
  async executeDownload(url, outputPath, options) {
    return new Promise((resolve, reject) => {
      const args = [
        ...options,
        '-o', outputPath,
        '--write-info-json',
        url
      ];

      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let error = '';
      let downloadedFile = null;

      process.stdout.on('data', (data) => {
        const line = data.toString();
        output += line;
        
        // Extract downloaded filename
        const downloadMatch = line.match(/\[download\] Destination: (.+)/);
        if (downloadMatch) {
          downloadedFile = downloadMatch[1];
        }
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Read metadata from info.json file
          const infoJsonPath = downloadedFile?.replace(/\.[^.]+$/, '.info.json');
          let metadata = {};
          
          if (infoJsonPath && fs.existsSync(infoJsonPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
              // Clean up info.json file
              fs.unlinkSync(infoJsonPath);
            } catch (err) {
              console.warn('Failed to read metadata file:', err.message);
            }
          }

          resolve({
            filePath: downloadedFile,
            metadata: this.formatMetadata(metadata)
          });
        } else {
          reject(new Error(`Download failed: ${error}`));
        }
      });
    });
  }

  /**
   * Build download options array
   * @param {Object} options - User options
   * @returns {Array} yt-dlp command options
   */
  buildDownloadOptions(options) {
    const args = [];

    // Video quality
    if (options.quality) {
      args.push('-f', options.quality);
    } else {
      // Default to best quality but reasonable file size
      args.push('-f', 'best[height<=1080]/best');
    }

    // Audio quality
    if (options.audioOnly) {
      args.push('-f', 'bestaudio');
      args.push('--audio-format', options.audioFormat || 'mp3');
    }

    // Subtitle options
    if (options.downloadSubtitles) {
      args.push('--write-subs');
      if (options.autoGeneratedSubs) {
        args.push('--write-auto-subs');
      }
      if (options.subtitleLanguage) {
        args.push('--sub-langs', options.subtitleLanguage);
      }
    }

    // Output format
    if (options.outputFormat) {
      args.push('--recode-video', options.outputFormat);
    }

    // Additional options
    if (options.maxFileSize) {
      args.push('--max-filesize', options.maxFileSize);
    }

    if (options.maxDuration) {
      args.push('--match-filter', `duration < ${options.maxDuration}`);
    }

    return args;
  }

  /**
   * Detect video platform from URL
   * @param {string} url - Video URL
   * @returns {string|null} Platform name
   */
  detectPlatform(url) {
    const platforms = {
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'twitch.tv': 'twitch',
      'kick.com': 'kick',
      'rumble.com': 'rumble',
      'vimeo.com': 'vimeo'
    };

    for (const [domain, platform] of Object.entries(platforms)) {
      if (url.includes(domain)) {
        return platform;
      }
    }

    return null;
  }

  /**
   * Validate video URL
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format metadata to standard structure
   * @param {Object} rawMetadata - Raw metadata from yt-dlp
   * @returns {Object} Formatted metadata
   */
  formatMetadata(rawMetadata) {
    return {
      title: rawMetadata.title || 'Unknown Title',
      description: rawMetadata.description || '',
      duration: rawMetadata.duration || 0,
      uploader: rawMetadata.uploader || 'Unknown',
      uploadDate: rawMetadata.upload_date || null,
      viewCount: rawMetadata.view_count || 0,
      likeCount: rawMetadata.like_count || 0,
      thumbnail: rawMetadata.thumbnail || null,
      tags: rawMetadata.tags || [],
      categories: rawMetadata.categories || [],
      language: rawMetadata.language || 'unknown',
      resolution: rawMetadata.resolution || 'unknown',
      fps: rawMetadata.fps || null,
      filesize: rawMetadata.filesize || null
    };
  }

  /**
   * Clean up downloaded files
   * @param {string} filePath - File path to clean up
   */
  async cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup file:', error.message);
    }
  }

  /**
   * Health check for yt-dlp
   * @returns {Promise<boolean>} yt-dlp availability
   */
  async healthCheck() {
    return new Promise((resolve) => {
      const process = spawn(this.ytDlpPath, ['--version']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = VideoDownloaderService;