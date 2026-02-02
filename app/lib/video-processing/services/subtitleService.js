/**
 * Subtitle Service
 * Handles SRT subtitle generation and formatting using subtitle.js
 */

const fs = require('fs');
const path = require('path');

class SubtitleService {
  constructor() {
    this.defaultOptions = {
      fontSize: 24,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      position: 'bottom',
      maxCharsPerLine: 40,
      maxLinesPerSubtitle: 2
    };
  }

  /**
   * Generate SRT file from transcription segments
   * @param {Array} segments - Transcription segments with timestamps
   * @param {string} outputPath - Output SRT file path
   * @param {Object} options - Subtitle generation options
   * @returns {Promise<string>} Path to generated SRT file
   */
  async generateSRT(segments, outputPath, options = {}) {
    try {
      const srtContent = this.convertToSRT(segments, options);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, srtContent, 'utf8');
      
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to generate SRT file: ${error.message}`);
    }
  }

  /**
   * Convert transcription segments to SRT format
   * @param {Array} segments - Transcription segments
   * @param {Object} options - Formatting options
   * @returns {string} SRT formatted content
   */
  convertToSRT(segments, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    let srtContent = '';
    let subtitleIndex = 1;

    segments.forEach((segment) => {
      if (!segment.text || !segment.startTime || !segment.endTime) {
        return; // Skip invalid segments
      }

      // Break long text into multiple lines
      const lines = this.breakTextIntoLines(segment.text, config.maxCharsPerLine);
      
      // Create subtitle entries (split if too many lines)
      const maxLines = config.maxLinesPerSubtitle;
      for (let i = 0; i < lines.length; i += maxLines) {
        const subtitleLines = lines.slice(i, i + maxLines);
        const text = subtitleLines.join('\n');
        
        // Calculate timing for this subtitle part
        const segmentDuration = segment.endTime - segment.startTime;
        const partDuration = segmentDuration / Math.ceil(lines.length / maxLines);
        const partIndex = Math.floor(i / maxLines);
        
        const startTime = segment.startTime + (partIndex * partDuration);
        const endTime = Math.min(segment.endTime, startTime + partDuration);

        srtContent += this.formatSRTEntry(
          subtitleIndex++,
          startTime,
          endTime,
          text
        );
      }
    });

    return srtContent;
  }

  /**
   * Format a single SRT entry
   * @param {number} index - Subtitle index
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {string} text - Subtitle text
   * @returns {string} Formatted SRT entry
   */
  formatSRTEntry(index, startTime, endTime, text) {
    const start = this.secondsToSRTTime(startTime);
    const end = this.secondsToSRTTime(endTime);
    
    return `${index}\n${start} --> ${end}\n${text}\n\n`;
  }

  /**
   * Convert seconds to SRT time format (HH:MM:SS,mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} SRT formatted time
   */
  secondsToSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Break text into lines based on character limit
   * @param {string} text - Text to break
   * @param {number} maxCharsPerLine - Maximum characters per line
   * @returns {Array} Array of text lines
   */
  breakTextIntoLines(text, maxCharsPerLine) {
    const words = text.trim().split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Generate VTT file from transcription segments
   * @param {Array} segments - Transcription segments with timestamps
   * @param {string} outputPath - Output VTT file path
   * @param {Object} options - Subtitle generation options
   * @returns {Promise<string>} Path to generated VTT file
   */
  async generateVTT(segments, outputPath, options = {}) {
    try {
      const vttContent = this.convertToVTT(segments, options);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, vttContent, 'utf8');
      
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to generate VTT file: ${error.message}`);
    }
  }

  /**
   * Convert transcription segments to VTT format
   * @param {Array} segments - Transcription segments
   * @param {Object} options - Formatting options
   * @returns {string} VTT formatted content
   */
  convertToVTT(segments, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    let vttContent = 'WEBVTT\n\n';

    segments.forEach((segment, index) => {
      if (!segment.text || !segment.startTime || !segment.endTime) {
        return; // Skip invalid segments
      }

      const startTime = this.secondsToVTTTime(segment.startTime);
      const endTime = this.secondsToVTTTime(segment.endTime);
      const text = this.breakTextIntoLines(segment.text, config.maxCharsPerLine).join('\n');

      vttContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
    });

    return vttContent;
  }

  /**
   * Convert seconds to VTT time format (HH:MM:SS.mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} VTT formatted time
   */
  secondsToVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Parse SRT file to segments
   * @param {string} srtPath - Path to SRT file
   * @returns {Promise<Array>} Array of subtitle segments
   */
  async parseSRT(srtPath) {
    try {
      const content = fs.readFileSync(srtPath, 'utf8');
      return this.parseSRTContent(content);
    } catch (error) {
      throw new Error(`Failed to parse SRT file: ${error.message}`);
    }
  }

  /**
   * Parse SRT content to segments
   * @param {string} content - SRT file content
   * @returns {Array} Array of subtitle segments
   */
  parseSRTContent(content) {
    const segments = [];
    const entries = content.trim().split('\n\n');

    entries.forEach((entry) => {
      const lines = entry.trim().split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const timeRange = lines[1];
        const text = lines.slice(2).join('\n');

        const [startTime, endTime] = timeRange.split(' --> ');
        
        segments.push({
          index,
          startTime: this.srtTimeToSeconds(startTime),
          endTime: this.srtTimeToSeconds(endTime),
          text: text.trim()
        });
      }
    });

    return segments;
  }

  /**
   * Convert SRT time format to seconds
   * @param {string} srtTime - SRT time format (HH:MM:SS,mmm)
   * @returns {number} Time in seconds
   */
  srtTimeToSeconds(srtTime) {
    const [time, milliseconds] = srtTime.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    return hours * 3600 + minutes * 60 + seconds + (parseInt(milliseconds) / 1000);
  }

  /**
   * Validate subtitle file format
   * @param {string} filePath - Path to subtitle file
   * @returns {Promise<Object>} Validation result
   */
  async validateSubtitleFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      
      let isValid = false;
      let segments = [];
      
      if (extension === '.srt') {
        segments = this.parseSRTContent(content);
        isValid = segments.length > 0;
      } else if (extension === '.vtt') {
        isValid = content.startsWith('WEBVTT');
      }

      return {
        isValid,
        format: extension.substring(1),
        segmentCount: segments.length,
        duration: segments.length > 0 ? segments[segments.length - 1].endTime : 0
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = SubtitleService;