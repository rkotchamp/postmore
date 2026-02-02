/**
 * Configuration Validator
 * Validates API keys and configuration for video processing services
 */

const fs = require('fs');
const { spawn } = require('child_process');

class ConfigValidator {
  /**
   * Validate all video processing configurations
   * @returns {Promise<Object>} Validation results for all services
   */
  static async validateAllConfigs() {
    const results = {
      huggingfaceWhisper: await this.validateHuggingFaceConfig(),
      ffmpeg: await this.validateFFmpegConfig(),
      ytdlp: await this.validateYtDlpConfig(),
      opencv: await this.validateOpenCVConfig(),
      environment: this.validateEnvironmentVariables()
    };

    results.overall = {
      isValid: Object.values(results).every(result => result.isValid),
      readyServices: Object.keys(results).filter(key => results[key].isValid && key !== 'overall'),
      missingServices: Object.keys(results).filter(key => !results[key].isValid && key !== 'overall')
    };

    return results;
  }

  /**
   * Validate Hugging Face Whisper configuration
   * @returns {Promise<Object>} Validation result
   */
  static async validateHuggingFaceConfig() {
    const result = {
      service: 'Hugging Face Whisper',
      isValid: false,
      issues: [],
      capabilities: []
    };

    // Check API URL
    const apiUrl = process.env.HUGGINGFACE_WHISPER_API_URL;
    if (!apiUrl) {
      result.issues.push('HUGGINGFACE_WHISPER_API_URL environment variable not set');
    } else {
      result.capabilities.push('API URL configured');
      
      // Validate URL format
      try {
        new URL(apiUrl);
        result.capabilities.push('Valid URL format');
      } catch {
        result.issues.push('Invalid HUGGINGFACE_WHISPER_API_URL format');
      }
    }

    // Check API token (optional)
    const apiToken = process.env.HUGGINGFACE_API_TOKEN;
    if (apiToken) {
      result.capabilities.push('API token configured');
    } else {
      result.capabilities.push('No API token (may be required)');
    }

    // Try to ping the API if URL is valid
    if (apiUrl && result.issues.length === 0) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
        });
        
        if (response.ok || response.status === 405) { // 405 Method Not Allowed is acceptable for GET on POST endpoint
          result.capabilities.push('API endpoint reachable');
          result.isValid = true;
        } else {
          result.issues.push(`API endpoint returned status ${response.status}`);
        }
      } catch (error) {
        result.issues.push(`Failed to reach API endpoint: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Validate FFmpeg configuration
   * @returns {Promise<Object>} Validation result
   */
  static async validateFFmpegConfig() {
    const result = {
      service: 'FFmpeg',
      isValid: false,
      issues: [],
      capabilities: []
    };

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

    // Test FFmpeg
    try {
      const ffmpegAvailable = await this.testCommand(ffmpegPath, ['-version']);
      if (ffmpegAvailable) {
        result.capabilities.push('FFmpeg executable available');
      } else {
        result.issues.push('FFmpeg executable not found or not working');
      }
    } catch (error) {
      result.issues.push(`FFmpeg test failed: ${error.message}`);
    }

    // Test FFprobe
    try {
      const ffprobeAvailable = await this.testCommand(ffprobePath, ['-version']);
      if (ffprobeAvailable) {
        result.capabilities.push('FFprobe executable available');
      } else {
        result.issues.push('FFprobe executable not found or not working');
      }
    } catch (error) {
      result.issues.push(`FFprobe test failed: ${error.message}`);
    }

    // Check for specific codecs
    try {
      const codecsOutput = await this.getCommandOutput(ffmpegPath, ['-codecs']);
      if (codecsOutput.includes('libx264')) {
        result.capabilities.push('H.264 encoding supported');
      }
      if (codecsOutput.includes('aac')) {
        result.capabilities.push('AAC audio encoding supported');
      }
    } catch (error) {
      result.issues.push('Could not check codec support');
    }

    result.isValid = result.capabilities.length >= 2 && result.issues.length === 0;
    return result;
  }

  /**
   * Validate yt-dlp configuration
   * @returns {Promise<Object>} Validation result
   */
  static async validateYtDlpConfig() {
    const result = {
      service: 'yt-dlp',
      isValid: false,
      issues: [],
      capabilities: []
    };

    const ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';

    try {
      const available = await this.testCommand(ytdlpPath, ['--version']);
      if (available) {
        result.capabilities.push('yt-dlp executable available');
        
        // Check version
        try {
          const version = await this.getCommandOutput(ytdlpPath, ['--version']);
          result.capabilities.push(`Version: ${version.trim()}`);
        } catch {
          result.capabilities.push('Version check failed');
        }

        // Test extractor list
        try {
          const extractors = await this.getCommandOutput(ytdlpPath, ['--list-extractors']);
          const supportedPlatforms = ['youtube', 'twitch', 'vimeo'];
          const availablePlatforms = supportedPlatforms.filter(platform => 
            extractors.includes(platform)
          );
          result.capabilities.push(`Supported platforms: ${availablePlatforms.join(', ')}`);
        } catch {
          result.capabilities.push('Could not check extractor support');
        }

        result.isValid = true;
      } else {
        result.issues.push('yt-dlp executable not found or not working');
      }
    } catch (error) {
      result.issues.push(`yt-dlp test failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate OpenCV configuration
   * @returns {Object} Validation result
   */
  static validateOpenCVConfig() {
    const result = {
      service: 'OpenCV (Face Detection)',
      isValid: false,
      issues: [],
      capabilities: []
    };

    try {
      const cv = require('opencv4nodejs');
      result.capabilities.push('opencv4nodejs package available');
      result.capabilities.push(`Version: ${cv.version}`);

      // Test cascade classifier
      try {
        const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
        result.capabilities.push('Face detection classifier loaded');
        result.isValid = true;
      } catch (error) {
        result.issues.push(`Face detection classifier failed: ${error.message}`);
      }
    } catch (error) {
      result.issues.push('opencv4nodejs package not installed or not working');
      result.capabilities.push('Face detection will be disabled');
    }

    return result;
  }

  /**
   * Validate environment variables
   * @returns {Object} Validation result
   */
  static validateEnvironmentVariables() {
    const result = {
      service: 'Environment Variables',
      isValid: true,
      issues: [],
      capabilities: []
    };

    const requiredVars = [
      'HUGGINGFACE_WHISPER_API_URL'
    ];

    const optionalVars = [
      'HUGGINGFACE_API_TOKEN',
      'FFMPEG_PATH',
      'FFPROBE_PATH',
      'YTDLP_PATH',
      'VIDEO_DOWNLOAD_DIR',
      'VIDEO_PROCESSING_TEMP_DIR'
    ];

    // Check required variables
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        result.capabilities.push(`${varName} is set`);
      } else {
        result.issues.push(`${varName} is required but not set`);
        result.isValid = false;
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        result.capabilities.push(`${varName} is set`);
      }
    });

    // Check directory permissions
    const tempDir = process.env.VIDEO_PROCESSING_TEMP_DIR || 'temp';
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.accessSync(tempDir, fs.constants.W_OK);
      result.capabilities.push('Temp directory writable');
    } catch (error) {
      result.issues.push(`Temp directory not writable: ${error.message}`);
    }

    return result;
  }

  /**
   * Test if a command is available and working
   * @param {string} command - Command to test
   * @param {Array} args - Command arguments
   * @returns {Promise<boolean>} Command availability
   */
  static testCommand(command, args = []) {
    return new Promise((resolve) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Get command output
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @returns {Promise<string>} Command output
   */
  static getCommandOutput(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
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
          resolve(output);
        } else {
          reject(new Error(error || 'Command failed'));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('Command timeout'));
      }, 10000);
    });
  }

  /**
   * Generate configuration report
   * @returns {Promise<string>} Human-readable configuration report
   */
  static async generateReport() {
    const config = await this.validateAllConfigs();
    let report = '# Video Processing Configuration Report\n\n';

    // Overall status
    if (config.overall.isValid) {
      report += '✅ **Overall Status: READY**\n\n';
    } else {
      report += '❌ **Overall Status: CONFIGURATION NEEDED**\n\n';
    }

    // Service details
    Object.keys(config).forEach(key => {
      if (key === 'overall') return;
      
      const service = config[key];
      report += `## ${service.service}\n`;
      report += service.isValid ? '✅ Ready\n' : '❌ Needs Configuration\n';
      
      if (service.capabilities.length > 0) {
        report += '\n**Capabilities:**\n';
        service.capabilities.forEach(cap => report += `- ${cap}\n`);
      }
      
      if (service.issues.length > 0) {
        report += '\n**Issues:**\n';
        service.issues.forEach(issue => report += `- ❌ ${issue}\n`);
      }
      
      report += '\n';
    });

    // Summary
    report += '## Summary\n';
    report += `- Ready Services: ${config.overall.readyServices.join(', ') || 'None'}\n`;
    report += `- Missing Services: ${config.overall.missingServices.join(', ') || 'None'}\n`;

    return report;
  }
}

module.exports = ConfigValidator;