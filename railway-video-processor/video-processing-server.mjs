/**
 * Railway Video Processing Server
 * Handles video downloads using yt-dlp and processing with FFmpeg
 * Runs on Railway to support binary dependencies not available on Vercel
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = process.env.VIDEO_DOWNLOAD_DIR || '/app/temp/downloads';
const API_SECRET = process.env.VIDEO_API_SECRET;
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

// Initialize Firebase Admin (for uploading processed videos)
let firebaseApp = null;
let storageBucket = null;

function initializeFirebase() {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
      storageBucket = getStorage().bucket();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.warn('Firebase initialization failed:', error.message);
    }
  } else {
    console.warn('Firebase credentials not configured - file uploads will not work');
  }
}

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Auth middleware - skip for health check
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!API_SECRET) {
    console.warn('VIDEO_API_SECRET not set - authentication disabled');
    return next();
  }

  if (authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', async (req, res) => {
  const checks = {
    server: true,
    ytdlp: false,
    ffmpeg: false,
    firebase: !!storageBucket,
    timestamp: new Date().toISOString()
  };

  // Check yt-dlp
  try {
    await runCommand(YTDLP_PATH, ['--version']);
    checks.ytdlp = true;
  } catch (e) {
    console.error('yt-dlp check failed:', e.message);
  }

  // Check FFmpeg
  try {
    await runCommand(FFMPEG_PATH, ['-version']);
    checks.ffmpeg = true;
  } catch (e) {
    console.error('FFmpeg check failed:', e.message);
  }

  const isHealthy = checks.ytdlp && checks.ffmpeg;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks
  });
});

// ============================================
// Get Video Metadata (without downloading)
// ============================================
app.post('/metadata', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[METADATA] Fetching metadata for: ${url}`);
    const metadata = await getVideoMetadata(url);
    res.json({
      success: true,
      metadata,
      platform: detectPlatform(url)
    });
  } catch (error) {
    console.error('[METADATA] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Download Video
// ============================================
app.post('/download', async (req, res) => {
  const { url, quality = 'best[height<=1080]/best', uploadToFirebase = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return res.status(400).json({
      error: 'Unsupported platform',
      supportedPlatforms: ['youtube', 'twitch', 'kick', 'rumble', 'tiktok', 'instagram', 'vimeo']
    });
  }

  try {
    console.log(`[DOWNLOAD] Starting download from ${platform}: ${url}`);

    // Get metadata first
    const metadata = await getVideoMetadata(url);
    console.log(`[DOWNLOAD] Video: "${metadata.title}" (${metadata.duration}s)`);

    // Download video
    const downloadResult = await downloadVideo(url, { quality, platform });
    console.log(`[DOWNLOAD] Downloaded to: ${downloadResult.filePath}`);

    let response = {
      success: true,
      metadata,
      platform,
      localPath: downloadResult.filePath,
      filename: path.basename(downloadResult.filePath)
    };

    // Upload to Firebase if configured and requested
    if (uploadToFirebase && storageBucket) {
      try {
        console.log('[DOWNLOAD] Uploading to Firebase Storage...');
        const firebaseUrl = await uploadToFirebaseStorage(downloadResult.filePath, metadata);
        response.firebaseUrl = firebaseUrl;
        console.log('[DOWNLOAD] Uploaded to Firebase:', firebaseUrl);

        // Clean up local file after upload
        cleanupFile(downloadResult.filePath);
      } catch (uploadError) {
        console.error('[DOWNLOAD] Firebase upload failed:', uploadError.message);
        response.uploadError = uploadError.message;
      }
    }

    res.json(response);

  } catch (error) {
    console.error('[DOWNLOAD] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Download Video with Metadata (combined)
// ============================================
app.post('/download-with-metadata', async (req, res) => {
  const { url, quality = 'best[height<=1080]/best', uploadToFirebase = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const platform = detectPlatform(url);
    const metadata = await getVideoMetadata(url);
    const downloadResult = await downloadVideo(url, { quality, platform });

    let response = {
      success: true,
      metadata,
      platform,
      download: {
        localPath: downloadResult.filePath,
        filename: path.basename(downloadResult.filePath)
      }
    };

    if (uploadToFirebase && storageBucket) {
      try {
        const firebaseUrl = await uploadToFirebaseStorage(downloadResult.filePath, metadata);
        response.download.firebaseUrl = firebaseUrl;
        cleanupFile(downloadResult.filePath);
      } catch (uploadError) {
        response.download.uploadError = uploadError.message;
      }
    }

    res.json(response);

  } catch (error) {
    console.error('[DOWNLOAD-WITH-METADATA] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get Available Formats
// ============================================
app.post('/formats', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const formats = await getAvailableFormats(url);
    res.json({ success: true, formats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Cleanup Endpoint (delete temp files)
// ============================================
app.post('/cleanup', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  // Security: only allow deleting files in the download directory
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(DOWNLOAD_DIR)) {
    return res.status(403).json({ error: 'Cannot delete files outside download directory' });
  }

  try {
    cleanupFile(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Run a command and return stdout
 */
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, options);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start process: ${err.message}`));
    });
  });
}

/**
 * Get video metadata using yt-dlp
 */
async function getVideoMetadata(url) {
  const platform = detectPlatform(url);
  const args = ['--dump-json', '--no-download', '--no-warnings'];

  // Platform-specific args
  if (platform === 'rumble') {
    args.push('--ignore-errors', '--no-check-certificate', '--extractor-retries', '5');
  }

  args.push(url);

  const stdout = await runCommand(YTDLP_PATH, args);
  const data = JSON.parse(stdout.trim());

  return {
    title: data.title || 'Unknown Title',
    description: data.description || '',
    duration: data.duration || 0,
    uploader: data.uploader || 'Unknown',
    uploadDate: data.upload_date || null,
    viewCount: data.view_count || 0,
    likeCount: data.like_count || 0,
    thumbnail: data.thumbnail || null,
    thumbnails: data.thumbnails || [],
    width: data.width || null,
    height: data.height || null,
    fps: data.fps || null,
    filesize: data.filesize || data.filesize_approx || null,
    id: data.id,
    originalUrl: url,
    platform
  };
}

/**
 * Download video using yt-dlp
 */
async function downloadVideo(url, options = {}) {
  const { quality = 'best[height<=1080]/best', platform } = options;

  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOAD_DIR, `video_${timestamp}.%(ext)s`);

  const args = [
    '--format', quality,
    '--output', outputTemplate,
    '--merge-output-format', 'mp4',
    '--no-warnings',
    '--no-playlist'
  ];

  // Platform-specific optimizations
  if (platform === 'rumble') {
    args.push('--ignore-errors', '--no-check-certificate', '--extractor-retries', '5');
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args);
    let stdout = '';
    let stderr = '';
    let downloadedFile = null;

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;

      // Extract the actual downloaded filename
      const destinationMatch = output.match(/\[download\] Destination: (.+)/);
      if (destinationMatch) {
        downloadedFile = destinationMatch[1].trim();
      }

      // Also check for merge output
      const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
      if (mergeMatch) {
        downloadedFile = mergeMatch[1].trim();
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && downloadedFile && fs.existsSync(downloadedFile)) {
        resolve({
          success: true,
          filePath: downloadedFile,
          platform
        });
      } else {
        // Try to find the file by pattern
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const matchedFile = files.find(f => f.startsWith(`video_${timestamp}`));

        if (matchedFile) {
          resolve({
            success: true,
            filePath: path.join(DOWNLOAD_DIR, matchedFile),
            platform
          });
        } else {
          reject(new Error(`Download failed: ${stderr || 'Unknown error'}`));
        }
      }
    });

    proc.on('error', (error) => {
      reject(new Error(`yt-dlp process failed: ${error.message}`));
    });
  });
}

/**
 * Get available formats for a video
 */
async function getAvailableFormats(url) {
  const args = ['--list-formats', '--no-warnings', url];
  return await runCommand(YTDLP_PATH, args);
}

/**
 * Upload file to Firebase Storage
 */
async function uploadToFirebaseStorage(filePath, metadata) {
  if (!storageBucket) {
    throw new Error('Firebase Storage not configured');
  }

  const filename = path.basename(filePath);
  const destination = `video-downloads/${Date.now()}-${filename}`;

  await storageBucket.upload(filePath, {
    destination,
    metadata: {
      contentType: 'video/mp4',
      metadata: {
        originalTitle: metadata.title,
        platform: metadata.platform,
        duration: String(metadata.duration)
      }
    }
  });

  // Make file public and get URL
  const file = storageBucket.file(destination);
  await file.makePublic();

  return `https://storage.googleapis.com/${storageBucket.name}/${destination}`;
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitch.tv')) return 'twitch';
  if (lowerUrl.includes('kick.com')) return 'kick';
  if (lowerUrl.includes('rumble.com')) return 'rumble';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('vimeo.com')) return 'vimeo';

  return null;
}

/**
 * Clean up a file
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[CLEANUP] Deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`[CLEANUP] Failed to delete ${filePath}:`, error.message);
  }
}

// ============================================
// Start Server
// ============================================
initializeFirebase();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       Railway Video Processing Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                            ║
║  Download:    ${DOWNLOAD_DIR}              ║
║  yt-dlp:      ${YTDLP_PATH}                                       ║
║  FFmpeg:      ${FFMPEG_PATH}                                       ║
║  Firebase:    ${storageBucket ? 'Connected' : 'Not configured'}                                 ║
╚══════════════════════════════════════════════════════════════╝

Endpoints:
  GET  /health              - Health check
  POST /metadata            - Get video metadata
  POST /download            - Download video
  POST /download-with-metadata - Download with metadata
  POST /formats             - List available formats
  POST /cleanup             - Delete temp file
`);
});

export default app;
