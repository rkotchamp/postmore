import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Video Download Service
 * Downloads videos from various platforms using yt-dlp
 *
 * In production: Uses Railway video processing service
 * In development: Uses local yt-dlp (if available)
 */

// Railway video processing service configuration
const RAILWAY_VIDEO_API_URL = process.env.RAILWAY_VIDEO_API_URL;
const VIDEO_API_SECRET = process.env.VIDEO_API_SECRET;

/**
 * Check if Railway service is configured
 */
function isRailwayConfigured() {
  return !!(RAILWAY_VIDEO_API_URL && VIDEO_API_SECRET);
}

/**
 * Call Railway video processing API
 */
async function callRailwayAPI(endpoint, body) {
  const url = `${RAILWAY_VIDEO_API_URL}${endpoint}`;
  console.log(`🚂 [RAILWAY] Calling ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VIDEO_API_SECRET}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Railway service returned ${response.status}`);
  }

  return data;
}

/**
 * Download file from URL to local path
 */
async function downloadFileFromUrl(fileUrl, localPath) {
  return new Promise((resolve, reject) => {
    const protocol = fileUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(localPath);

    protocol.get(fileUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        downloadFileFromUrl(response.headers.location, localPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(localPath);
      });
    }).on('error', (err) => {
      fs.unlink(localPath, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

/**
 * Download video from URL
 */
export const downloadVideo = async (url, options = {}) => {
  const {
    quality = 'best[height<=1080]',
    outputPath = '/tmp',
    format = 'mp4'
  } = options;

  console.log('🎬 [DOWNLOAD] Starting video download...');
  console.log('📹 [DOWNLOAD] URL:', url);
  console.log('⚙️ [DOWNLOAD] Options:', { quality, outputPath, format });

  // Use Railway service in production
  if (isRailwayConfigured()) {
    console.log('🚂 [DOWNLOAD] Using Railway video processing service...');

    try {
      const result = await callRailwayAPI('/download', {
        url,
        quality,
        uploadToFirebase: false // Don't upload, we need local file for processing
      });

      if (result.firebaseUrl) {
        // Download from Firebase to local temp
        const timestamp = Date.now();
        const localFilePath = path.join(outputPath, `video_${timestamp}.mp4`);
        console.log(`🚂 [DOWNLOAD] Downloading from Firebase to local: ${localFilePath}`);
        await downloadFileFromUrl(result.firebaseUrl, localFilePath);

        return {
          success: true,
          filePath: localFilePath,
          platform: result.platform || detectPlatform(url),
          originalUrl: url,
          source: 'railway-firebase'
        };
      } else if (result.localPath) {
        // File is on Railway server - this won't work for Vercel
        // We need Firebase URL or a way to stream the file
        console.warn('🚂 [DOWNLOAD] Railway returned local path - file not accessible from Vercel');
        throw new Error('Railway service should upload to Firebase for hybrid deployment');
      }

      throw new Error('Railway service did not return a valid file URL');

    } catch (error) {
      console.error('🚂 [DOWNLOAD] Railway service failed:', error.message);
      throw new Error(`Railway download failed: ${error.message}`);
    }
  }

  // Fallback: Local yt-dlp (for development)
  console.log('💻 [DOWNLOAD] Using local yt-dlp...');

  return new Promise((resolve, reject) => {
    const platform = detectPlatform(url);
    const timestamp = Date.now();
    const filename = `video_${timestamp}.%(ext)s`;
    const outputTemplate = path.join(outputPath, filename);

    console.log('🎯 [DOWNLOAD] Platform:', platform);
    console.log('📁 [DOWNLOAD] Output template:', outputTemplate);

    const args = [
      '--format', quality,
      '--output', outputTemplate,
      '--merge-output-format', format,
      '--no-warnings'
    ];

    // Platform-specific optimizations
    if (platform === 'rumble') {
      args.push('--ignore-errors');
      args.push('--no-check-certificate');
      args.push('--extractor-retries', '5');
    }

    args.push(url);

    console.log('🔧 [DOWNLOAD] Command args:', args);
    console.log('🚀 [DOWNLOAD] Executing: yt-dlp', args.join(' '));

    const ytdlp = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    let downloadedFile = null;

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('📺 [DOWNLOAD] stdout:', output.trim());

      // Extract the actual downloaded filename from yt-dlp output (stdout)
      const destinationMatch = output.match(/\[download\] Destination: (.+)/);
      if (destinationMatch) {
        downloadedFile = destinationMatch[1];
        console.log('📁 [DOWNLOAD] Detected file:', downloadedFile);
      }

      // Also check for merge output
      const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
      if (mergeMatch) {
        downloadedFile = mergeMatch[1].trim();
      }
    });

    ytdlp.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('⚠️ [DOWNLOAD] stderr:', output.trim());
    });

    ytdlp.on('close', (code) => {
      console.log(`🏁 [DOWNLOAD] Process exited with code: ${code}`);
      console.log('📁 [DOWNLOAD] Downloaded file:', downloadedFile);
      console.log('🔍 [DOWNLOAD] File exists:', downloadedFile ? fs.existsSync(downloadedFile) : 'No file detected');

      if (code === 0 && downloadedFile && fs.existsSync(downloadedFile)) {
        console.log('✅ [DOWNLOAD] Success!');
        resolve({
          success: true,
          filePath: downloadedFile,
          platform,
          originalUrl: url,
          source: 'local'
        });
      } else {
        console.error('❌ [DOWNLOAD] Failed:', { code, downloadedFile, stderr: stderr.substring(0, 500) });
        reject(new Error(`Video download failed: ${stderr || 'Unknown error'}`));
      }
    });

    ytdlp.on('error', (error) => {
      console.error('❌ [DOWNLOAD] Process error:', error.message);
      reject(new Error(`yt-dlp process failed: ${error.message}. Make sure yt-dlp is installed or configure RAILWAY_VIDEO_API_URL.`));
    });
  });
};

/**
 * Download video with metadata
 */
export const downloadVideoWithMetadata = async (url, options = {}) => {
  try {
    // Use Railway service for combined download+metadata if configured
    if (isRailwayConfigured()) {
      console.log('🚂 [DOWNLOAD+METADATA] Using Railway video processing service...');

      const result = await callRailwayAPI('/download-with-metadata', {
        url,
        quality: options.quality || 'best[height<=1080]',
        uploadToFirebase: true
      });

      // Download from Firebase to local temp for further processing
      const timestamp = Date.now();
      const outputPath = options.outputPath || '/tmp';
      const localFilePath = path.join(outputPath, `video_${timestamp}.mp4`);

      if (result.download?.firebaseUrl) {
        console.log(`🚂 [DOWNLOAD+METADATA] Downloading from Firebase: ${result.download.firebaseUrl}`);
        await downloadFileFromUrl(result.download.firebaseUrl, localFilePath);
      } else {
        throw new Error('Railway service did not return Firebase URL');
      }

      return {
        success: true,
        filePath: localFilePath,
        platform: result.platform || detectPlatform(url),
        originalUrl: url,
        metadata: result.metadata || {
          title: 'Unknown',
          duration: 0,
          platform: result.platform
        },
        source: 'railway'
      };
    }

    // Fallback: Local processing
    // First get metadata
    const metadata = await getVideoMetadata(url);

    // Then download video
    const downloadResult = await downloadVideo(url, options);

    return {
      ...downloadResult,
      metadata
    };
  } catch (error) {
    throw new Error(`Download with metadata failed: ${error.message}`);
  }
};

/**
 * Get video metadata without downloading
 */
export const getVideoMetadata = async (url) => {
  // Use Railway service if configured
  if (isRailwayConfigured()) {
    console.log('🚂 [METADATA] Using Railway video processing service...');

    try {
      const result = await callRailwayAPI('/metadata', { url });
      return result.metadata || result;
    } catch (error) {
      console.error('🚂 [METADATA] Railway service failed:', error.message);
      throw new Error(`Railway metadata failed: ${error.message}`);
    }
  }

  // Fallback: Local yt-dlp
  console.log('💻 [METADATA] Using local yt-dlp...');
  console.log('📹 [METADATA] URL:', url);

  return new Promise((resolve, reject) => {
    const platform = detectPlatform(url);
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings'
    ];

    console.log('🎯 [METADATA] Platform:', platform);

    if (platform === 'rumble') {
      args.push('--ignore-errors');
      args.push('--no-check-certificate');
      console.log('🔧 [METADATA] Added Rumble-specific args');
    }

    args.push(url);

    console.log('🔧 [METADATA] Command args:', args);
    console.log('🚀 [METADATA] Executing: yt-dlp', args.join(' '));

    const ytdlp = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('📺 [METADATA] stdout chunk received (length:', output.length, ')');
    });

    ytdlp.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('⚠️ [METADATA] stderr:', output.trim());
    });

    ytdlp.on('close', (code) => {
      console.log(`🏁 [METADATA] Process exited with code: ${code}`);
      console.log('📄 [METADATA] stdout length:', stdout.length);
      console.log('⚠️ [METADATA] stderr length:', stderr.length);

      if (code === 0) {
        try {
          const metadata = JSON.parse(stdout.trim());
          console.log('✅ [METADATA] Successfully parsed metadata');
          console.log('📝 [METADATA] Title:', metadata.title);
          console.log('⏱️ [METADATA] Duration:', metadata.duration + 's');

          resolve({
            title: metadata.title || 'Unknown Title',
            description: metadata.description || '',
            duration: metadata.duration || 0,
            uploader: metadata.uploader || 'Unknown',
            platform: detectPlatform(url),
            originalUrl: url,
            id: metadata.id
          });
        } catch (parseError) {
          console.error('❌ [METADATA] JSON parse error:', parseError.message);
          console.log('📄 [METADATA] Raw stdout sample:', stdout.substring(0, 200) + '...');
          reject(new Error(`Failed to parse metadata: ${parseError.message}`));
        }
      } else {
        console.error('❌ [METADATA] Command failed with stderr:', stderr.substring(0, 500));
        reject(new Error(`Metadata extraction failed: ${stderr}`));
      }
    });

    ytdlp.on('error', (error) => {
      console.error('❌ [METADATA] Process error:', error.message);
      reject(new Error(`yt-dlp process failed: ${error.message}. Make sure yt-dlp is installed or configure RAILWAY_VIDEO_API_URL.`));
    });
  });
};

/**
 * Detect platform from URL
 */
const detectPlatform = (url) => {
  if (!url) return 'other';
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitch.tv')) return 'twitch';
  if (lowerUrl.includes('kick.com')) return 'kick';
  if (lowerUrl.includes('rumble.com')) return 'rumble';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('vimeo.com')) return 'vimeo';
  return 'other';
};

/**
 * Clean up downloaded file
 */
export const cleanupDownloadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🧹 [CLEANUP] Deleted file:', filePath);
    }
  } catch (error) {
    console.error('Failed to cleanup file:', error);
  }
};

/**
 * Get available video formats for a URL
 */
export const getAvailableFormats = async (url) => {
  // Use Railway service if configured
  if (isRailwayConfigured()) {
    try {
      const result = await callRailwayAPI('/formats', { url });
      return result.formats;
    } catch (error) {
      throw new Error(`Railway formats failed: ${error.message}`);
    }
  }

  // Fallback: Local yt-dlp
  return new Promise((resolve, reject) => {
    const args = ['--list-formats', '--no-warnings', url];
    const ytdlp = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Failed to get formats: ${stderr}`));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`yt-dlp process failed: ${error.message}`));
    });
  });
};

// Export detectPlatform for use in other modules
export { detectPlatform };
