/**
 * Railway Video Processing Server
 * Handles video downloads using yt-dlp and processing with FFmpeg
 * Runs on Railway to support binary dependencies not available on Vercel
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import puppeteer from 'puppeteer-core';
import { jsonrepair } from 'jsonrepair';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = process.env.VIDEO_DOWNLOAD_DIR || '/app/temp/downloads';
const API_SECRET = process.env.VIDEO_API_SECRET;
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';
const PROCESSING_DIR = process.env.VIDEO_PROCESSING_TEMP_DIR || '/app/temp/processing';
const MONGODB_URI = process.env.MONGODB_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ============================================
// Robustness Utilities
// ============================================

/**
 * Retry with exponential backoff for API calls
 */
async function retryWithBackoff(fn, { maxRetries = 3, baseDelay = 1000, label = 'operation' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Don't retry on auth or validation errors
      if (error.status === 400 || error.status === 401 || error.status === 403) throw error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`[RETRY] ${label} attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${(delay / 1000).toFixed(1)}s`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Run a spawn command with timeout
 */
function runCommandWithTimeout(cmd, args, { timeout = 600000, label = 'command' } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
      reject(new Error(`${label} timed out after ${timeout / 1000}s`));
    }, timeout);

    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) resolve(stdout);
      else reject(new Error(`${label} failed (code ${code}): ${stderr.substring(0, 500)}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (killed) return;
      reject(new Error(`${label} process error: ${err.message}`));
    });
  });
}

/**
 * Concurrency semaphore for limiting parallel jobs
 */
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise(resolve => this.queue.push(resolve));
    this.current++;
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }

  get active() { return this.current; }
  get waiting() { return this.queue.length; }
}

const pipelineSemaphore = new Semaphore(2);  // Max 2 concurrent pipeline jobs
const ffmpegSemaphore = new Semaphore(3);    // Max 3 concurrent FFmpeg processes

/**
 * Cleanup old temp files (runs every 30 minutes)
 */
function startCleanupCron() {
  const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

  setInterval(() => {
    const dirs = [DOWNLOAD_DIR, PROCESSING_DIR];
    let cleaned = 0;
    const now = Date.now();

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          try {
            const stat = fs.statSync(fullPath);
            if (now - stat.mtimeMs > MAX_AGE_MS) {
              if (entry.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(fullPath);
              }
              cleaned++;
            }
          } catch (e) { /* skip files we can't stat */ }
        }
      } catch (e) { /* skip dirs we can't read */ }
    }

    if (cleaned > 0) console.log(`[CLEANUP-CRON] Removed ${cleaned} old temp files/dirs`);
  }, 30 * 60 * 1000); // Every 30 minutes
}

// ============================================
// MongoDB Connection
// ============================================
let mongoConnected = false;

async function connectMongo() {
  if (mongoConnected && mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) {
    console.warn('[MONGO] MONGODB_URI not set - database features disabled');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    mongoConnected = true;
    console.log(`[MONGO] Connected to ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error('[MONGO] Connection failed:', error.message);
    throw error;
  }
}

// ============================================
// Mongoose Models (inline to avoid import issues)
// ============================================
const VideoProjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceUrl: { type: String, trim: true },
  sourceType: { type: String, enum: ['url', 'upload'], required: true },
  originalVideo: {
    filename: String, path: String, url: String, duration: Number,
    size: Number, format: String, resolution: String, thumbnail: String, thumbnailUrl: String
  },
  transcription: {
    text: String, language: String, duration: Number,
    segments: [{ start: Number, end: Number, text: String }],
    source: { type: String, enum: ['whisper', 'upload'], default: 'whisper' },
    processingCost: Number, processedAt: Date
  },
  aiAnalysis: {
    model: String, totalCost: Number, processingTime: Number,
    promptTokens: Number, responseTokens: Number, analyzedAt: Date
  },
  saveStatus: {
    isSaved: { type: Boolean, default: false }, savedAt: Date,
    autoDeleteAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  },
  status: { type: String, enum: ['processing', 'completed', 'failed', 'error'], default: 'processing' },
  errorMessage: String,
  processingStarted: Date,
  processingCompleted: Date,
  analytics: {
    totalClipsGenerated: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    lastAccessed: Date,
    processingStage: { type: String, enum: ['downloading', 'transcribing', 'analyzing', 'cutting', 'saving', 'completed', 'error'], default: 'downloading' },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    progressMessage: { type: String, default: "we're cooking" },
    lastUpdated: { type: Date, default: Date.now },
    error: String, warning: String
  }
}, { timestamps: true });

const VideoClipSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoProject', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  templateHeader: { type: String, trim: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  duration: { type: Number, required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  templateCustomData: { username: String, profileIcon: String, customTitle: String },
  templateStatus: { type: String, enum: ['pending', 'ready', 'processing', 'failed'], default: 'pending' },
  generatedVideo: {
    vertical: { path: String, url: String, format: String, resolution: String, aspectRatio: { type: String, default: '9:16' }, size: Number },
    horizontal: { path: String, url: String, format: String, resolution: String, aspectRatio: { type: String, default: '16:9' }, size: Number },
    url: String, format: String, resolution: String, size: Number
  },
  previewVideo: { path: String, url: String, duration: { type: Number, default: 60 }, size: Number },
  viralityScore: { type: Number, min: 0, max: 100, default: 0 },
  aiAnalysis: {
    source: String, reason: String, engagementType: String,
    contentTags: [String], hasSetup: Boolean, hasPayoff: Boolean, analyzedAt: Date
  },
  status: { type: String, enum: ['ready', 'applying_template', 'failed'], default: 'ready' },
  createdAt: { type: Date, default: Date.now }
});

VideoClipSchema.index({ projectId: 1, createdAt: -1 });

const VideoProject = mongoose.models.VideoProject || mongoose.model('VideoProject', VideoProjectSchema);
const VideoClip = mongoose.models.VideoClip || mongoose.model('VideoClip', VideoClipSchema);

// ============================================
// OpenAI Whisper Client
// ============================================
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient && OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      timeout: 300000, // 5 min timeout for large audio
      maxRetries: 3
    });
  }
  return openaiClient;
}

// ============================================
// Progress Messages (GenZ style)
// ============================================
const PROGRESS_MESSAGES = {
  downloading: ["getting the sauce", "downloading fire", "we're cooking", "securing the bag"],
  transcribing: ["reading the vibes", "decoding chaos", "AI working overtime", "trust the process"],
  analyzing: ["hunting viral moments", "ranking the clips", "found some heat", "picking the best"],
  cutting: ["chopping clips", "making magic", "almost there", "crafting content"],
  saving: ["saving your W's", "uploading to cloud", "final boss mode", "finishing touches"],
  completed: ["WE DID THAT!", "clips ready to slay", "time to go viral"],
  error: ["something went wrong", "we'll fix this", "technical difficulties"]
};

function getRandomProgressMessage(stage) {
  const messages = PROGRESS_MESSAGES[stage];
  if (!messages || messages.length === 0) return "processing your content";
  return messages[Math.floor(Math.random() * messages.length)];
}

// SSE connections map: projectId -> Set of response objects
const sseClients = new Map();

function sendSSEToProject(projectId, data) {
  const clients = sseClients.get(projectId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (e) { clients.delete(res); }
  }
}

async function updateProjectProgress(projectId, stage, percentage) {
  const message = getRandomProgressMessage(stage);

  // Push to SSE clients instantly (real-time)
  sendSSEToProject(projectId, { stage, percentage, message });

  // Also persist to MongoDB (for page refreshes / polling fallback)
  try {
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: {
        'analytics.processingStage': stage,
        'analytics.progressPercentage': percentage,
        'analytics.progressMessage': message,
        'analytics.lastUpdated': new Date()
      }
    });
    console.log(`[PROGRESS] ${projectId}: ${percentage}% - "${message}"`);
  } catch (error) {
    console.error(`[PROGRESS] Failed to update for ${projectId}:`, error.message);
  }
}

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

// Ensure directories exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSING_DIR)) {
  fs.mkdirSync(PROCESSING_DIR, { recursive: true });
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

  if (!API_SECRET) {
    console.error('FATAL: VIDEO_API_SECRET not set - rejecting all requests for security');
    return res.status(503).json({ error: 'Server misconfigured - authentication secret not set' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ============================================
// Health Check Endpoint
// ============================================
// SSE endpoint for real-time progress updates
app.get('/progress/:projectId', (req, res) => {
  const { projectId } = req.params;
  console.log(`[SSE] Client connected for project: ${projectId}`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected', projectId })}\n\n`);

  // Register this client
  if (!sseClients.has(projectId)) sseClients.set(projectId, new Set());
  sseClients.get(projectId).add(res);

  // Keep-alive every 30 seconds
  const keepAlive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch (e) { clearInterval(keepAlive); }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    console.log(`[SSE] Client disconnected for project: ${projectId}`);
    clearInterval(keepAlive);
    const clients = sseClients.get(projectId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(projectId);
    }
  });
});

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
// Extract Frame as Thumbnail (for platforms without good thumbnails)
// ============================================
app.post('/extract-frame', async (req, res) => {
  const { url, timestamp = 5 } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[FRAME] Extracting frame from: ${url} at ${timestamp}s`);
    const platform = detectPlatform(url);

    // First get the direct video URL using yt-dlp
    const args = ['--no-download', '--get-url', '--format', 'best[height<=720]/best'];

    // Add impersonation for Kick and Rumble
    if (platform === 'kick' || platform === 'rumble') {
      args.unshift('--impersonate', 'chrome');
      args.push('--ignore-errors', '--no-check-certificate');
    }

    args.push(url);

    const videoUrl = await runCommand(YTDLP_PATH, args);
    const directUrl = videoUrl.trim().split('\n')[0];

    if (!directUrl) {
      throw new Error('Could not get direct video URL');
    }

    console.log(`[FRAME] Got direct URL, extracting frame with FFmpeg...`);

    // Extract frame using FFmpeg
    const outputPath = path.join(DOWNLOAD_DIR, `frame_${Date.now()}.jpg`);
    const ffmpegArgs = [
      '-ss', String(timestamp),
      '-i', directUrl,
      '-vframes', '1',
      '-f', 'image2',
      '-q:v', '2',
      '-y',
      outputPath
    ];

    await runCommand(FFMPEG_PATH, ffmpegArgs);

    // Read the frame and convert to base64
    const frameBuffer = fs.readFileSync(outputPath);
    const base64Frame = frameBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Frame}`;

    // Cleanup temp file
    cleanupFile(outputPath);

    console.log(`[FRAME] Successfully extracted frame`);
    res.json({
      success: true,
      thumbnail: dataUrl,
      platform
    });

  } catch (error) {
    console.error('[FRAME] Error:', error.message);
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
 * Get Rumble metadata via oEmbed API (fallback when yt-dlp is blocked by Cloudflare)
 */
async function getRumbleOEmbedMetadata(url) {
  console.log(`[RUMBLE-OEMBED] Fetching metadata via oEmbed for: ${url}`);
  const oembedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`;

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error(`Rumble oEmbed failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[RUMBLE-OEMBED] Got metadata: "${data.title}"`);

  return {
    title: data.title || 'Unknown Title',
    description: '',
    duration: data.duration || 0,
    uploader: data.author_name || 'Unknown',
    uploadDate: null,
    viewCount: 0,
    likeCount: 0,
    thumbnail: data.thumbnail_url || null,
    thumbnails: data.thumbnail_url ? [{ url: data.thumbnail_url, width: data.width, height: data.height }] : [],
    width: data.width || null,
    height: data.height || null,
    fps: null,
    filesize: null,
    id: null,
    originalUrl: url,
    platform: 'rumble'
  };
}

/**
 * Get video metadata using yt-dlp
 */
async function getVideoMetadata(url) {
  const platform = detectPlatform(url);

  // Try yt-dlp first
  try {
    return await getVideoMetadataWithYtdlp(url, platform);
  } catch (ytdlpError) {
    console.warn(`[METADATA] yt-dlp failed for ${platform}: ${ytdlpError.message}`);

    // Fallback to oEmbed for Rumble when Cloudflare blocks yt-dlp
    if (platform === 'rumble') {
      console.log('[METADATA] Trying Rumble oEmbed fallback...');
      return await getRumbleOEmbedMetadata(url);
    }

    throw ytdlpError;
  }
}

/**
 * Get video metadata using yt-dlp (internal)
 */
async function getVideoMetadataWithYtdlp(url, platform) {
  const args = ['--dump-json', '--no-download', '--no-warnings'];

  // Platform-specific args - Kick and Rumble require browser impersonation
  if (platform === 'kick' || platform === 'rumble') {
    args.push('--impersonate', 'chrome');
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
 * Extract direct video URL from Rumble embed page (fallback when yt-dlp is blocked)
 */
async function extractRumbleDirectUrl(url) {
  // Step 1: Use oEmbed API to get the correct embed URL (the page slug ID != embed ID)
  console.log(`[RUMBLE-DIRECT] Getting embed URL via oEmbed API...`);
  const oembedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`;
  const oembedResp = await fetch(oembedUrl);
  if (!oembedResp.ok) throw new Error(`Rumble oEmbed API returned ${oembedResp.status}`);

  const oembedData = await oembedResp.json();
  // oEmbed html field contains: <iframe src="https://rumble.com/embed/v5abcde/?pub=xyz" ...>
  const embedMatch = oembedData.html?.match(/src="(https:\/\/rumble\.com\/embed\/[^"]+)"/);
  if (!embedMatch) throw new Error('Could not find embed URL in oEmbed response');

  const embedUrl = embedMatch[1];
  console.log(`[RUMBLE-DIRECT] Trying embed page: ${embedUrl}`);

  // Step 2: Fetch the embed page to find direct video URLs
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://rumble.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) throw new Error(`Rumble embed page returned ${response.status}`);

  const html = await response.text();

  // Step 3: Extract direct MP4 URL from embed page
  let videoUrl = null;

  // Try multiple patterns for extracting the MP4 URL
  const patterns = [
    /"mp4":\s*\{[^}]*"url":\s*"([^"]+)"/,
    /"url":\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/,
    /(?:"webm|mp4|hls)"?\s*:\s*\{[^}]*?"url"\s*:\s*"(https?:\/\/[^"]+)"/,
    /https?:\/\/[a-zA-Z0-9.-]+\.rumble\.com\/[^"'\s]+\.mp4/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      videoUrl = (match[1] || match[0]).replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      break;
    }
  }

  if (!videoUrl) throw new Error('Could not extract direct video URL from Rumble embed page');

  console.log(`[RUMBLE-DIRECT] Found direct URL: ${videoUrl.substring(0, 80)}...`);
  return videoUrl;
}

/**
 * Download a direct URL using FFmpeg (used as fallback for Rumble)
 */
async function downloadDirectUrl(directUrl, outputPath, onProgress = null) {
  console.log(`[DOWNLOAD-DIRECT] Downloading from direct URL...`);

  return new Promise((resolve, reject) => {
    const args = [
      '-i', directUrl,
      '-c', 'copy', // No re-encoding, just copy streams
      '-y', // Overwrite
      outputPath
    ];

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      // FFmpeg outputs progress to stderr
      const timeMatch = data.toString().match(/time=(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch && onProgress) {
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        const secs = parseInt(timeMatch[3]);
        const totalSecs = hours * 3600 + mins * 60 + secs;
        onProgress(totalSecs); // Report seconds downloaded
      }
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`[DOWNLOAD-DIRECT] Complete: ${fileSizeMB}MB`);
        resolve({ success: true, filePath: outputPath });
      } else {
        reject(new Error(`Direct download failed (code ${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (error) => {
      reject(new Error(`FFmpeg process failed: ${error.message}`));
    });
  });
}

/**
 * Download video using yt-dlp, with Rumble direct-URL fallback
 */
async function downloadVideo(url, options = {}) {
  const { platform } = options;

  // Try yt-dlp first
  try {
    return await downloadVideoWithYtdlp(url, options);
  } catch (ytdlpError) {
    // If Rumble fails with 403, try extracting direct URL from embed page
    if (platform === 'rumble' && ytdlpError.message.includes('403')) {
      console.log(`[DOWNLOAD] yt-dlp blocked by Rumble Cloudflare, trying direct URL extraction...`);
      try {
        const directUrl = await extractRumbleDirectUrl(url);
        const outputPath = path.join(DOWNLOAD_DIR, `video_${Date.now()}.mp4`);
        const result = await downloadDirectUrl(directUrl, outputPath, options.onProgress ? (secs) => {
          // We don't know total duration here, so just log progress
          console.log(`[DOWNLOAD-DIRECT] Downloaded ${Math.floor(secs / 60)}m ${secs % 60}s`);
        } : null);
        return { ...result, platform };
      } catch (directError) {
        console.error(`[DOWNLOAD] Rumble direct URL fallback also failed:`, directError.message);
        throw new Error(`Rumble download failed (Cloudflare 403). yt-dlp: ${ytdlpError.message}. Direct: ${directError.message}`);
      }
    }
    throw ytdlpError;
  }
}

async function downloadVideoWithYtdlp(url, options = {}) {
  const { quality = 'best[height<=1080]/best', platform, onProgress = null } = options;

  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOAD_DIR, `video_${timestamp}.%(ext)s`);

  const args = [
    '--format', quality,
    '--output', outputTemplate,
    '--merge-output-format', 'mp4',
    '--no-warnings',
    '--no-playlist',
    '--newline' // Force progress on new lines so we can parse it
  ];

  // Platform-specific optimizations - Kick and Rumble require browser impersonation
  if (platform === 'kick' || platform === 'rumble') {
    args.push('--impersonate', 'chrome');
    args.push(
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--ignore-errors', '--no-check-certificate', '--extractor-retries', '5',
      '--retry-sleep', '5', '--socket-timeout', '30'
    );
  }

  args.push(url);

  const DOWNLOAD_TIMEOUT = 30 * 60 * 1000; // 30 minutes max for download

  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args);
    let stdout = '';
    let stderr = '';
    let downloadedFile = null;
    let lastProgressLog = 0;

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Download timed out after 30 minutes'));
    }, DOWNLOAD_TIMEOUT);

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

      // Parse download progress percentage
      const progressMatch = output.match(/\[download\]\s+([\d.]+)%/);
      if (progressMatch) {
        const pct = parseFloat(progressMatch[1]);
        const now = Date.now();
        // Log every 10% or every 15 seconds
        if (pct - lastProgressLog >= 10 || now - lastProgressLog > 15000) {
          console.log(`[DOWNLOAD] Progress: ${pct.toFixed(1)}%`);
          lastProgressLog = pct;
          if (onProgress) onProgress(pct);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && downloadedFile && fs.existsSync(downloadedFile)) {
        const fileSizeMB = (fs.statSync(downloadedFile).size / 1024 / 1024).toFixed(1);
        console.log(`[DOWNLOAD] Complete: ${fileSizeMB}MB`);
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
          const fileSizeMB = (fs.statSync(path.join(DOWNLOAD_DIR, matchedFile)).size / 1024 / 1024).toFixed(1);
          console.log(`[DOWNLOAD] Complete (fallback): ${fileSizeMB}MB`);
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
      clearTimeout(timeout);
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

/**
 * Convert raw technical errors to user-friendly messages
 */
function getUserFriendlyError(rawError) {
  const msg = rawError || 'Unknown error';

  // Download / platform errors
  if (msg.includes('403') && msg.includes('Forbidden'))
    return 'This video is blocked or region-restricted. Try a different video or platform.';
  if (msg.includes('404') || msg.includes('Not Found'))
    return 'Video not found. It may have been deleted or the link is invalid.';
  if (msg.includes('Private') || msg.includes('private'))
    return 'This video is private. Only public videos can be processed.';
  if (msg.includes('age') || msg.includes('Sign in'))
    return 'This video requires sign-in or age verification and cannot be processed.';
  if (msg.includes('timed out') || msg.includes('timeout'))
    return 'The video took too long to download. Try a shorter video or check your link.';
  if (msg.includes('Unsupported URL') || msg.includes('unsupported'))
    return 'This video link is not supported. Try YouTube, Twitch, Kick, or Rumble.';
  if (msg.includes('Download failed'))
    return 'Failed to download this video. The link may be broken or the platform is blocking access.';

  // Transcription errors
  if (msg.includes('Whisper') || msg.includes('transcri'))
    return 'Audio transcription failed. The video may have no audio or an unsupported format.';

  // Analysis errors
  if (msg.includes('DeepSeek') || msg.includes('API error'))
    return 'AI analysis temporarily unavailable. Please try again in a few minutes.';

  // Storage errors
  if (msg.includes('Firebase') || msg.includes('upload'))
    return 'Failed to save processed clips. Please try again.';

  // Generic fallback
  return 'Something went wrong while processing your video. Please try again.';
}

// ============================================
// Audio Chunking Service (ported from audioChunkingService.js)
// ============================================
const WHISPER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const CHUNK_DURATION_MINUTES = 10;

async function getAudioDuration(filePath) {
  const { stdout } = await execAsync(
    `${FFPROBE_PATH} -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  const duration = parseFloat(stdout.trim());
  console.log(`[CHUNKING] Audio duration: ${duration.toFixed(2)}s (${(duration / 60).toFixed(1)} minutes)`);
  return duration;
}

async function extractAudio(videoPath, outputPath) {
  console.log(`[CHUNKING] Extracting audio from video...`);
  await execAsync(
    `${FFMPEG_PATH} -i "${videoPath}" -vn -acodec libmp3lame -ab 128k -ar 22050 -y "${outputPath}"`
  );
  if (!fs.existsSync(outputPath)) throw new Error('Audio extraction failed - output file not created');
  const stats = fs.statSync(outputPath);
  console.log(`[CHUNKING] Audio extracted: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
  return outputPath;
}

async function splitAudioIntoChunks(audioPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const duration = await getAudioDuration(audioPath);
  const chunkDurationSeconds = CHUNK_DURATION_MINUTES * 60;
  const totalChunks = Math.ceil(duration / chunkDurationSeconds);
  console.log(`[CHUNKING] Splitting into ${totalChunks} chunks of ${CHUNK_DURATION_MINUTES} minutes each`);

  const chunkPaths = [];
  for (let i = 0; i < totalChunks; i++) {
    const startTime = i * chunkDurationSeconds;
    const chunkPath = path.join(outputDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
    console.log(`[CHUNKING] Creating chunk ${i + 1}/${totalChunks} (starting at ${startTime}s)`);
    await execAsync(
      `${FFMPEG_PATH} -i "${audioPath}" -ss ${startTime} -t ${chunkDurationSeconds} -acodec libmp3lame -ab 128k -ar 22050 -y "${chunkPath}"`
    );
    if (fs.existsSync(chunkPath)) {
      const chunkStats = fs.statSync(chunkPath);
      if (chunkStats.size <= WHISPER_MAX_SIZE_BYTES) {
        chunkPaths.push(chunkPath);
      } else {
        console.warn(`[CHUNKING] Chunk ${i + 1} is over 25MB limit (${(chunkStats.size / (1024 * 1024)).toFixed(2)}MB)`);
        chunkPaths.push(chunkPath); // Still add it, Whisper may handle it
      }
    }
  }
  return chunkPaths;
}

async function chunkVideoForWhisper(videoPath) {
  const stats = fs.statSync(videoPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[CHUNKING] Video size: ${fileSizeMB}MB`);

  if (stats.size <= WHISPER_MAX_SIZE_BYTES) {
    return { needsChunking: false, originalPath: videoPath, chunks: [videoPath], totalChunks: 1 };
  }

  const tempDir = path.dirname(videoPath);
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const chunkDir = path.join(tempDir, `${baseName}_chunks`);
  const audioPath = path.join(tempDir, `${baseName}_audio.mp3`);

  await extractAudio(videoPath, audioPath);
  const chunkPaths = await splitAudioIntoChunks(audioPath, chunkDir);

  // Clean up temp audio file
  try { fs.unlinkSync(audioPath); } catch (e) { /* ignore */ }

  console.log(`[CHUNKING] Successfully created ${chunkPaths.length} chunks`);
  return {
    needsChunking: true, originalPath: videoPath, chunks: chunkPaths,
    totalChunks: chunkPaths.length, chunkDirectory: chunkDir,
    originalSizeMB: parseFloat(fileSizeMB)
  };
}

function cleanupChunks(chunkDirectory) {
  try {
    if (fs.existsSync(chunkDirectory)) {
      fs.rmSync(chunkDirectory, { recursive: true, force: true });
      console.log(`[CHUNKING] Cleaned up chunks directory: ${chunkDirectory}`);
    }
  } catch (error) {
    console.error('[CHUNKING] Cleanup failed:', error.message);
  }
}

// ============================================
// Whisper Transcription Service (ported from openaiWhisperService.js)
// ============================================

async function transcribeSingleFile(filePath, options = {}) {
  const { language = null, responseFormat = 'verbose_json', temperature = 0 } = options;
  const openai = getOpenAI();
  if (!openai) throw new Error('OpenAI API key not configured');

  console.log(`[WHISPER] Starting transcription for: ${path.basename(filePath)}`);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const estimatedMinutes = Math.ceil(stats.size / (1024 * 1024));
  const estimatedCost = (estimatedMinutes * 0.006).toFixed(4);
  console.log(`[WHISPER] File size: ${fileSizeMB}MB, estimated cost: $${estimatedCost}`);

  const requestParams = {
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: responseFormat,
    temperature,
    timestamp_granularities: ['word', 'segment']
  };
  if (language) requestParams.language = language;

  const startTime = Date.now();
  const transcription = await retryWithBackoff(
    async () => {
      // Re-create stream on retry since streams are single-use
      requestParams.file = fs.createReadStream(filePath);
      return await openai.audio.transcriptions.create(requestParams);
    },
    { maxRetries: 3, baseDelay: 2000, label: 'Whisper API' }
  );

  const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[WHISPER] Processing completed in ${processingTime}s`);

  if (responseFormat === 'verbose_json') {
    return {
      success: true, text: transcription.text, language: transcription.language,
      duration: transcription.duration, segments: transcription.segments || [],
      words: transcription.words || [], processingTime: parseFloat(processingTime),
      estimatedCost: parseFloat(estimatedCost), fileSizeMB: parseFloat(fileSizeMB)
    };
  }
  return {
    success: true, text: transcription, processingTime: parseFloat(processingTime),
    estimatedCost: parseFloat(estimatedCost), fileSizeMB: parseFloat(fileSizeMB)
  };
}

async function transcribeWithWhisper(filePath, options = {}, onProgress = null) {
  const chunkResult = await chunkVideoForWhisper(filePath);

  if (!chunkResult.needsChunking) {
    if (onProgress) await onProgress(50); // Single file = halfway through transcription range
    const result = await transcribeSingleFile(filePath, options);
    if (onProgress) await onProgress(100);
    return result;
  }

  console.log(`[WHISPER] Large file (${chunkResult.originalSizeMB}MB), processing ${chunkResult.totalChunks} chunks`);
  const chunkTranscriptions = [];
  let totalCost = 0, totalProcessingTime = 0, cumulativeTime = 0;

  for (let i = 0; i < chunkResult.chunks.length; i++) {
    console.log(`[WHISPER] Processing chunk ${i + 1}/${chunkResult.totalChunks}`);

    // Report per-chunk progress (0-100% of the transcription phase)
    if (onProgress) {
      const chunkProgress = Math.round((i / chunkResult.totalChunks) * 100);
      await onProgress(chunkProgress);
    }

    const chunkTranscription = await transcribeSingleFile(chunkResult.chunks[i], options);

    // Clean up this chunk immediately after transcription to free disk space
    try { fs.unlinkSync(chunkResult.chunks[i]); } catch (e) { /* ignore */ }

    let chunkDuration = 0;
    if (chunkTranscription.segments) {
      chunkTranscription.segments.forEach(s => { s.start += cumulativeTime; s.end += cumulativeTime; });
      if (chunkTranscription.segments.length > 0) {
        chunkDuration = chunkTranscription.segments[chunkTranscription.segments.length - 1].end - cumulativeTime;
      }
    }
    if (chunkTranscription.words) {
      chunkTranscription.words.forEach(w => { w.start += cumulativeTime; w.end += cumulativeTime; });
    }

    chunkTranscriptions.push(chunkTranscription);
    totalCost += chunkTranscription.estimatedCost || 0;
    totalProcessingTime += chunkTranscription.processingTime || 0;
    cumulativeTime += chunkDuration > 0 ? chunkDuration : (10 * 60);
  }

  if (onProgress) await onProgress(100);
  if (chunkResult.chunkDirectory) cleanupChunks(chunkResult.chunkDirectory);

  return {
    success: true,
    text: chunkTranscriptions.map(t => t.text).join(' '),
    language: chunkTranscriptions[0]?.language || 'unknown',
    duration: cumulativeTime,
    segments: chunkTranscriptions.flatMap(t => t.segments || []),
    words: chunkTranscriptions.flatMap(t => t.words || []),
    processingTime: totalProcessingTime, estimatedCost: totalCost,
    fileSizeMB: chunkResult.originalSizeMB, chunked: true,
    totalChunks: chunkResult.totalChunks
  };
}

// ============================================
// DeepSeek Analysis Service (ported from deepseekAnalysisService.js)
// ============================================

function estimateTokens(text) { return Math.ceil(text.length / 4); }

function calculateDeepSeekCost(prompt, response) {
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(response);
  return parseFloat(((inputTokens / 1000000) * 0.27 + (outputTokens / 1000000) * 1.10).toFixed(6));
}

async function callDeepSeekAPI(prompt) {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await retryWithBackoff(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
      try {
        const resp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are an expert content curator specializing in viral short-form video content. You must respond with valid JSON only — no markdown, no code fences, no explanations.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 8192,
            temperature: 0.7,
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          const error = new Error(`DeepSeek API error: ${resp.status} ${err.error?.message || resp.statusText}`);
          error.status = resp.status;
          throw error;
        }
        return resp;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    },
    { maxRetries: 3, baseDelay: 2000, label: 'DeepSeek API' }
  );

  const data = await response.json();
  if (!data.choices?.[0]?.message) throw new Error('Invalid response from DeepSeek');
  return { content: data.choices[0].message.content, usage: data.usage, model: data.model };
}

function calculateMaxClips(durationSeconds) {
  const durationMinutes = (durationSeconds || 0) / 60;
  return Math.min(50, Math.max(5, Math.ceil(durationMinutes / 3)));
}

function buildAnalysisPrompt(segmentsText, options) {
  const { minClipDuration = 15, maxClipDuration = 60, maxClips = 10,
    videoTitle = 'Video', videoType = 'general', language = 'auto-detected',
    duration = 'unknown' } = options;

  const minTarget = Math.max(5, Math.ceil(maxClips * 0.6));

  return `You are an expert short-form content strategist. Your job is to find the most viral, engaging, standalone moments from a long video transcript.

VIDEO: "${videoTitle}"
TYPE: ${videoType} | DURATION: ${duration}s | LANGUAGE: ${language}

TRANSCRIPTION (with timestamps):
${segmentsText}

RULES FOR FINDING VIRAL CLIPS:

1. STANDALONE TEST (most important): Each clip MUST make complete sense to someone who has NEVER seen the original video. If a clip requires context from earlier in the video to understand, REJECT it.

2. SCROLL-STOP HOOK: The first 2-3 seconds of every clip must contain one of:
   - A bold or controversial claim ("Most people get this completely wrong...")
   - A surprising revelation ("I lost $2 million in one day...")
   - An emotional moment (anger, laughter, shock, vulnerability)
   - A compelling question ("What would you do if...?")
   - A direct challenge to the viewer

3. COMPLETE STORY ARC: Every clip must have:
   - SETUP: Context that makes the viewer understand the situation (2-5 seconds)
   - DEVELOPMENT: The core content, tension, or argument (main body)
   - PAYOFF: A conclusion, punchline, lesson, or emotional resolution
   - NO clip should end mid-sentence or mid-thought

4. NATURAL BOUNDARIES: Start and end on complete sentences. Include 1-2 seconds of buffer before the first word and after the last word.

5. CONTENT SIGNALS TO PRIORITIZE:
   - Heated disagreements or debates
   - Personal stories and vulnerable confessions
   - "Aha moment" explanations that simplify complex topics
   - Unexpected humor or comedic timing
   - Quotable one-liners ("That's the thing about...")
   - Contrarian takes that challenge conventional wisdom
   - Emotional climaxes (someone getting excited, angry, or moved)
   - Power dynamics shifting (underdog moments, someone being proven wrong)

SCORING (viralityScore = hook + flow + value + trend):
- HOOK (0-25): Would someone stop scrolling in the first 3 seconds?
- FLOW (0-25): Does the clip have clear beginning → middle → end with no confusion?
- VALUE (0-25): Does it teach, inspire, entertain, or trigger a strong emotion?
- TREND (0-25): Does it fit short-form content patterns? Is it shareable/quotable?
- Minimum total: 50. Only include clips you'd genuinely want to share.

OUTPUT FORMAT — Return ONLY a JSON array, no other text:
[
  {
    "startTime": 45.2,
    "endTime": 72.8,
    "duration": 27.6,
    "title": "Descriptive SEO title explaining the clip content (50-80 chars)",
    "templateHeader": "Scroll-stopping hook text for social overlay (<50 chars)",
    "reason": "Why this specific moment is viral — what emotion or reaction it triggers",
    "viralityScore": 85,
    "hookScore": 22,
    "flowScore": 20,
    "valueScore": 23,
    "trendScore": 20,
    "engagementType": "reaction|educational|funny|dramatic|relatable|inspirational|controversial",
    "hasSetup": true,
    "hasPayoff": true,
    "contentTags": ["emotion", "surprise", "quotable"]
  }
]

TEMPLATE HEADER EXAMPLES by type:
- Reaction: "His face when he heard the price"
- Educational: "This changed how I think about money"
- Funny: "I can't believe he actually said this"
- Dramatic: "The moment everything fell apart"
- Controversial: "Nobody wants to hear this but..."

CONSTRAINTS:
- Find ${minTarget} to ${maxClips} clips (prioritize quality, but don't leave good moments on the table)
- Each clip: ${minClipDuration}-${maxClipDuration} seconds
- viralityScore >= 50 minimum
- Spread clips across the full video — don't cluster all clips in one section
- JSON array only, no explanations outside the array`;
}

function validateAndCleanClips(rawClips, options) {
  const { minClipDuration = 15, maxClipDuration = 60, videoDuration = Infinity } = options;
  return rawClips
    .filter(clip => {
      if (!clip.startTime || !clip.endTime || !clip.title || !clip.templateHeader) return false;
      const duration = clip.endTime - clip.startTime;
      if (duration < minClipDuration || duration > maxClipDuration) return false;
      if (clip.startTime < 0 || clip.endTime > videoDuration) return false;
      if (clip.viralityScore < 50) return false;
      return true;
    })
    .map(clip => ({
      ...clip,
      duration: parseFloat((clip.endTime - clip.startTime).toFixed(1)),
      startTime: parseFloat(clip.startTime.toFixed(1)),
      endTime: parseFloat(clip.endTime.toFixed(1)),
      viralityScore: Math.min(100, Math.max(0, clip.viralityScore)),
      analyzedAt: new Date().toISOString(), source: 'deepseek-v3'
    }))
    .sort((a, b) => b.viralityScore - a.viralityScore);
}

function parseDeepSeekResponse(content) {
  // Layer 1: Strip markdown code block wrappers (```json ... ``` or ``` ... ```)
  let cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Layer 2: Try direct parse first (fastest path)
  try { return JSON.parse(cleaned); } catch (e) { /* continue */ }

  // Layer 3: Use jsonrepair — industry standard for fixing malformed LLM JSON
  try {
    const repaired = jsonrepair(cleaned);
    const result = JSON.parse(repaired);
    console.log(`[DEEPSEEK] jsonrepair fixed response — ${Array.isArray(result) ? result.length + ' clips' : 'object'}`);
    return result;
  } catch (e) {
    console.warn(`[DEEPSEEK] jsonrepair failed:`, e.message);
  }

  // Layer 4: Try extracting just the JSON array and repairing that
  const arrayMatch = cleaned.match(/\[[\s\S]*/);
  if (arrayMatch) {
    try {
      const repaired = jsonrepair(arrayMatch[0]);
      const result = JSON.parse(repaired);
      console.log(`[DEEPSEEK] jsonrepair fixed extracted array — ${result.length} clips`);
      return result;
    } catch (e) { /* continue */ }
  }

  // Layer 5: Last resort — manual truncation recovery for severely broken JSON
  const arrayStart = cleaned.indexOf('[');
  if (arrayStart === -1) {
    console.error(`[DEEPSEEK] No JSON array found. Raw (first 500 chars):`, content.slice(0, 500));
    throw new Error('DeepSeek response contains no JSON array');
  }

  let jsonStr = cleaned.slice(arrayStart);
  let lastGoodEnd = -1;
  let braceDepth = 0;
  let inString = false;
  let escape = false;

  for (let i = 1; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braceDepth++;
    if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0) lastGoodEnd = i;
    }
  }

  if (lastGoodEnd > 0) {
    jsonStr = jsonStr.slice(0, lastGoodEnd + 1) + ']';
    try {
      const result = JSON.parse(jsonStr);
      console.log(`[DEEPSEEK] Manual truncation repair — recovered ${result.length} clips`);
      return result;
    } catch (e) { /* fall through */ }
  }

  console.error(`[DEEPSEEK] All JSON repair layers failed. Raw (first 500 chars):`, content.slice(0, 500));
  throw new Error('DeepSeek response is not valid JSON and could not be repaired');
}

function needsChunking(transcription) {
  const segmentsText = transcription.segments
    .map(s => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s]: ${s.text}`)
    .join('\n');
  return estimateTokens(segmentsText) > 100000;
}

async function analyzeChunkWithDeepSeek(chunk, options, chunkIndex, totalChunks) {
  console.log(`[DEEPSEEK-MAP] Analyzing chunk ${chunkIndex + 1}/${totalChunks}`);
  const perChunkMaxClips = Math.ceil((options.maxClips || 10) / totalChunks) + 3;
  const prompt = buildAnalysisPrompt(chunk.segmentsText, {
    ...options, maxClips: perChunkMaxClips,
    duration: chunk.duration.toFixed(1),
    language: options.language || 'auto-detected'
  });
  const chunkContext = `NOTE: You are analyzing segment ${chunkIndex + 1} of ${totalChunks} from a longer video. Timestamps in this segment range from ${chunk.startTime.toFixed(1)}s to ${chunk.endTime.toFixed(1)}s. Only find clips within this time range.\n\n`;
  const fullPrompt = chunkContext + prompt;

  try {
    const startTime = Date.now();
    const response = await callDeepSeekAPI(fullPrompt);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const rawClips = parseDeepSeekResponse(response.content);
    const validClips = (rawClips || [])
      .filter(clip => {
        if (!clip.startTime || !clip.endTime || !clip.title) return false;
        const dur = clip.endTime - clip.startTime;
        if (dur < (options.minClipDuration || 15) || dur > (options.maxClipDuration || 60)) return false;
        if (clip.startTime < chunk.startTime || clip.endTime > chunk.endTime) return false;
        if (clip.viralityScore < 50) return false;
        return true;
      })
      .map(clip => ({
        ...clip, duration: parseFloat((clip.endTime - clip.startTime).toFixed(1)),
        startTime: parseFloat(clip.startTime.toFixed(1)), endTime: parseFloat(clip.endTime.toFixed(1)),
        chunkIndex, processingTime: parseFloat(processingTime), source: 'deepseek-v3-chunk'
      }));

    console.log(`[DEEPSEEK-MAP] Chunk ${chunkIndex + 1}: Found ${validClips.length} valid clips`);
    return { chunkIndex, clips: validClips, processingTime: parseFloat(processingTime), cost: calculateDeepSeekCost(prompt, response.content) };
  } catch (error) {
    console.error(`[DEEPSEEK-MAP] Chunk ${chunkIndex + 1} failed:`, error.message);
    return { chunkIndex, clips: [], error: error.message, processingTime: 0, cost: 0 };
  }
}

function mergeAndDeduplicateClips(chunkResults, options) {
  const { maxClips = 10 } = options;
  const allClips = [];
  let totalProcessingTime = 0, totalCost = 0;

  chunkResults.forEach(r => {
    if (r.clips?.length > 0) allClips.push(...r.clips);
    totalProcessingTime += r.processingTime || 0;
    totalCost += r.cost || 0;
  });

  if (allClips.length === 0) return { clips: [], totalProcessingTime, totalCost };

  allClips.sort((a, b) => b.viralityScore - a.viralityScore);

  const deduped = [];
  for (const clip of allClips) {
    const isDup = deduped.some(existing => {
      const overlapStart = Math.max(clip.startTime, existing.startTime);
      const overlapEnd = Math.min(clip.endTime, existing.endTime);
      return Math.max(0, overlapEnd - overlapStart) > 5;
    });
    if (!isDup) deduped.push({ ...clip, analyzedAt: new Date().toISOString(), source: 'deepseek-v3-mapreduce' });
  }

  return { clips: deduped.slice(0, maxClips), totalProcessingTime, totalCost };
}

async function analyzeContentWithDeepSeek(transcription, options = {}) {
  console.log(`[DEEPSEEK] Starting content analysis for: ${options.videoTitle || 'Video'}`);

  if (needsChunking(transcription)) {
    console.log(`[DEEPSEEK] Transcript too long, using MapReduce`);
    // Chunk transcript into 30-min chunks with 10-min overlap
    const chunkDuration = 30 * 60, overlapDuration = 10 * 60;
    const totalDuration = transcription.duration;
    const chunks = [];
    let currentStart = 0, chunkIndex = 0;

    while (currentStart < totalDuration) {
      const chunkEnd = Math.min(currentStart + chunkDuration, totalDuration);
      const chunkSegments = transcription.segments.filter(s => s.start >= currentStart && s.start < chunkEnd);
      if (chunkSegments.length > 0) {
        chunks.push({
          index: chunkIndex, startTime: currentStart, endTime: chunkEnd,
          duration: chunkEnd - currentStart, segments: chunkSegments,
          segmentsText: chunkSegments.map(s => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s]: ${s.text}`).join('\n')
        });
        chunkIndex++;
      }
      if (chunkEnd >= totalDuration) break;
      currentStart = chunkEnd - overlapDuration;
    }

    console.log(`[DEEPSEEK] MAP Phase: Processing ${chunks.length} chunks in parallel`);
    const chunkResults = await Promise.all(
      chunks.map((chunk, i) => analyzeChunkWithDeepSeek(chunk, options, i, chunks.length))
    );

    const merged = mergeAndDeduplicateClips(chunkResults, options);
    console.log(`[DEEPSEEK] MapReduce completed: ${merged.clips.length} final clips`);
    return {
      success: true, clips: merged.clips, totalClips: merged.clips.length,
      processingTime: merged.totalProcessingTime, cost: merged.totalCost,
      metadata: { model: 'deepseek-chat-v3-mapreduce', totalChunks: chunks.length }
    };
  }

  // Single analysis for shorter transcripts
  const segmentsText = transcription.segments
    .map(s => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s]: ${s.text}`)
    .join('\n');

  const prompt = buildAnalysisPrompt(segmentsText, {
    ...options, duration: transcription.duration?.toFixed(1) || 'unknown',
    language: transcription.language || 'auto-detected'
  });

  const startTime = Date.now();
  const response = await callDeepSeekAPI(prompt);
  const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

  const rawClips = parseDeepSeekResponse(response.content);
  const validClips = validateAndCleanClips(rawClips, {
    ...options, videoDuration: transcription.duration
  });

  console.log(`[DEEPSEEK] Found ${validClips.length} valid clips in ${processingTime}s`);
  return {
    success: true, clips: validClips, totalClips: validClips.length,
    processingTime: parseFloat(processingTime),
    cost: calculateDeepSeekCost(prompt, response.content),
    metadata: { model: 'deepseek-chat-v3', promptTokens: estimateTokens(prompt), responseTokens: estimateTokens(response.content) }
  };
}

// ============================================
// Clip Cutting Service (ported from clipCuttingService.js)
// ============================================

async function cutVideoClip(inputVideoPath, startTime, endTime, outputDir, options = {}) {
  await ffmpegSemaphore.acquire();
  try {
    const duration = endTime - startTime;
    const timestamp = Date.now();
    const { aspectRatio = 'original', platform = 'none' } = options;

    const platformSuffix = platform !== 'none' ? `_${platform}` : '';
    const outputFileName = `clip_${timestamp}_${startTime}s-${endTime}s${platformSuffix}.mp4`;
    const outputFilePath = path.join(outputDir, outputFileName);

    console.log(`[CLIP-CUTTER] Cutting clip: ${startTime}s - ${endTime}s (${aspectRatio})`);

    const args = ['-ss', startTime.toString(), '-i', inputVideoPath, '-t', duration.toString()];
    const videoFilters = [];
    let needsReencoding = false;

    if (aspectRatio === '9:16' || platform === 'tiktok' || platform === 'reels' || platform === 'shorts') {
      videoFilters.push('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920');
      needsReencoding = true;
    } else if (aspectRatio === '2.35:1' || platform === 'cinematic_horizontal') {
      videoFilters.push('scale=2540:1080:force_original_aspect_ratio=decrease,pad=2540:1080:(ow-iw)/2:(oh-ih)/2');
      needsReencoding = true;
    }

    if (needsReencoding && videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','), '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'medium', '-crf', '23');
    } else {
      args.push('-c', 'copy');
    }

    args.push('-avoid_negative_ts', 'make_zero', '-y', outputFilePath);

    await runCommandWithTimeout(FFMPEG_PATH, args, {
      timeout: Math.max(300000, duration * 10000), // At least 5 min, or 10x clip duration
      label: `FFmpeg cut ${startTime}s-${endTime}s`
    });

    if (!fs.existsSync(outputFilePath)) throw new Error('FFmpeg output file not created');
    const fileStats = fs.statSync(outputFilePath);
    console.log(`[CLIP-CUTTER] Clip created: ${outputFileName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);

    return { success: true, filePath: outputFilePath, fileName: outputFileName, size: fileStats.size, duration };
  } finally {
    ffmpegSemaphore.release();
  }
}

async function extractPreviewSegment(inputVideoPath, startTime, endTime, clipId, outputDir) {
  await ffmpegSemaphore.acquire();
  try {
    const clipDuration = endTime - startTime;
    const previewDuration = Math.min(60, clipDuration);
    const timestamp = Date.now();
    const outputFileName = `preview_${timestamp}_${clipId}.mp4`;
    const outputFilePath = path.join(outputDir, outputFileName);

    const args = [
      '-ss', startTime.toString(), '-i', inputVideoPath,
      '-t', previewDuration.toString(),
      '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'ultrafast', '-crf', '28',
      '-avoid_negative_ts', 'make_zero', '-y', outputFilePath
    ];

    await runCommandWithTimeout(FFMPEG_PATH, args, { timeout: 300000, label: `FFmpeg preview ${clipId}` });

    if (!fs.existsSync(outputFilePath)) throw new Error('Preview file not created');
    const fileStats = fs.statSync(outputFilePath);

    // Upload to Firebase
    let firebaseUrl = null;
    if (storageBucket) {
      const videoFile = fs.readFileSync(outputFilePath);
      const destination = `clipper-previews/${clipId}_preview_${timestamp}.mp4`;
      const file = storageBucket.file(destination);
      await file.save(videoFile, { contentType: 'video/mp4' });
      await file.makePublic();
      firebaseUrl = `https://storage.googleapis.com/${storageBucket.name}/${destination}`;
    }

    // Clean up local file
    try { fs.unlinkSync(outputFilePath); } catch (e) { /* ignore */ }

    return { success: true, url: firebaseUrl, duration: previewDuration, size: fileStats.size };
  } finally {
    ffmpegSemaphore.release();
  }
}

async function uploadClipToFirebase(filePath, uploadKey) {
  if (!storageBucket) throw new Error('Firebase Storage not configured');
  const videoFile = fs.readFileSync(filePath);
  const destination = `clipper-clips/${uploadKey}_${Date.now()}.mp4`;
  const file = storageBucket.file(destination);
  await file.save(videoFile, { contentType: 'video/mp4' });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${storageBucket.name}/${destination}`;
  return { downloadURL: url, name: destination, size: videoFile.length };
}

async function processClipsFromMetadata(inputVideoPath, clipsMetadata, projectId, originalVideoTitle, outputDir) {
  console.log(`[CLIP-PROCESSOR] Processing ${clipsMetadata.length} clips for project ${projectId}`);
  const processedClips = [];

  for (let i = 0; i < clipsMetadata.length; i++) {
    const clipMeta = clipsMetadata[i];
    console.log(`[CLIP-PROCESSOR] Processing clip ${i + 1}/${clipsMetadata.length}: ${clipMeta.startTime}s - ${clipMeta.endTime}s`);

    try {
      // Cut vertical (9:16)
      const videoResultVertical = await cutVideoClip(inputVideoPath, clipMeta.startTime, clipMeta.endTime, outputDir, {
        aspectRatio: '9:16', platform: 'vertical'
      });

      // Cut horizontal (2.35:1)
      const videoResultHorizontal = await cutVideoClip(inputVideoPath, clipMeta.startTime, clipMeta.endTime, outputDir, {
        aspectRatio: '2.35:1', platform: 'cinematic'
      });

      // Extract preview
      const previewResult = await extractPreviewSegment(
        inputVideoPath, clipMeta.startTime, clipMeta.endTime, clipMeta._id || clipMeta.id, outputDir
      );

      // Upload both clips to Firebase
      const verticalUpload = await uploadClipToFirebase(
        videoResultVertical.filePath, `${projectId}_clip_${clipMeta.startTime}s_9x16`
      );
      const horizontalUpload = await uploadClipToFirebase(
        videoResultHorizontal.filePath, `${projectId}_clip_${clipMeta.startTime}s_2.35x1`
      );

      // Cleanup local clip files immediately (progressive cleanup for long videos)
      try {
        fs.unlinkSync(videoResultVertical.filePath);
        fs.unlinkSync(videoResultHorizontal.filePath);
      } catch (e) { /* ignore */ }

      processedClips.push({
        clipId: clipMeta._id || clipMeta.id,
        title: clipMeta.title || `${originalVideoTitle} - ${clipMeta.startTime}s`,
        startTime: clipMeta.startTime, endTime: clipMeta.endTime,
        duration: clipMeta.duration, viralityScore: clipMeta.viralityScore,
        generatedVideo: {
          vertical: {
            url: verticalUpload.downloadURL, format: 'mp4',
            size: videoResultVertical.size, duration: videoResultVertical.duration,
            resolution: '720p', aspectRatio: '9:16'
          },
          horizontal: {
            url: horizontalUpload.downloadURL, format: 'mp4',
            size: videoResultHorizontal.size, duration: videoResultHorizontal.duration,
            resolution: '720p', aspectRatio: '2.35:1'
          },
          url: verticalUpload.downloadURL, format: 'mp4',
          size: videoResultVertical.size, duration: videoResultVertical.duration,
          resolution: '720p'
        },
        previewVideo: { url: previewResult.url, format: 'mp4', size: previewResult.size, duration: previewResult.duration }
      });

      console.log(`[CLIP-PROCESSOR] Clip ${i + 1} done: "${clipMeta.title}"`);
    } catch (error) {
      console.error(`[CLIP-PROCESSOR] Clip ${i + 1} failed:`, error.message);
      processedClips.push({
        clipId: clipMeta._id || clipMeta.id,
        title: `Error: ${clipMeta.title || 'Processing failed'}`,
        startTime: clipMeta.startTime, endTime: clipMeta.endTime,
        duration: clipMeta.duration, viralityScore: clipMeta.viralityScore,
        error: error.message, generatedVideo: null
      });
    }
  }

  const successCount = processedClips.filter(c => !c.error).length;
  console.log(`[CLIP-PROCESSOR] Complete: ${successCount}/${clipsMetadata.length} clips processed`);
  return processedClips;
}

// ============================================
// Full Pipeline Endpoint: POST /process-clips-pipeline
// ============================================
const processingLocks = new Set();

app.post('/process-clips-pipeline', async (req, res) => {
  const { url, projectId, userId, options = {}, captionOptions = {} } = req.body;

  if (!url || !projectId || !userId) {
    return res.status(400).json({ error: 'url, projectId, and userId are required' });
  }

  // Check for duplicate processing
  if (processingLocks.has(projectId)) {
    return res.status(409).json({ error: 'Project is already being processed' });
  }

  // Respond immediately, process in background
  res.json({ success: true, message: 'Pipeline started', projectId, status: 'processing' });

  // Acquire pipeline semaphore (limits concurrent jobs)
  processingLocks.add(projectId);

  await pipelineSemaphore.acquire();
  try {
    await connectMongo();

    // === Step 1: Download video ===
    console.log(`[PIPELINE] Starting for project ${projectId}: ${url}`);
    await updateProjectProgress(projectId, 'downloading', 5);

    const platform = detectPlatform(url);
    const metadata = await getVideoMetadata(url);
    console.log(`[PIPELINE] Video: "${metadata.title}" (${metadata.duration}s) from ${platform}`);
    await updateProjectProgress(projectId, 'downloading', 10);

    // Download with progress reporting to UI
    const downloadProgress = async (pct) => {
      // Map download 0-100% to pipeline 10-25%
      const pipelinePct = Math.round(10 + (pct / 100) * 15);
      await updateProjectProgress(projectId, 'downloading', pipelinePct);
    };

    const downloadResult = await downloadVideo(url, {
      quality: 'best[height<=720]/best', platform, onProgress: downloadProgress
    });
    console.log(`[PIPELINE] Downloaded to: ${downloadResult.filePath}`);
    await updateProjectProgress(projectId, 'downloading', 25);

    // === Step 2: Audio chunking ===
    console.log(`[PIPELINE] Preparing audio for transcription...`);
    await updateProjectProgress(projectId, 'transcribing', 28);

    // === Step 2b: Transcribe with Whisper (with per-chunk progress) ===
    console.log(`[PIPELINE] Starting Whisper transcription...`);

    // Progress callback: maps transcription 0-100% into pipeline 30-58%
    const transcriptionProgress = async (pct) => {
      const pipelinePct = Math.round(30 + (pct / 100) * 28); // 30% to 58%
      await updateProjectProgress(projectId, 'transcribing', pipelinePct);
    };

    const transcriptionResult = await transcribeWithWhisper(downloadResult.filePath, {
      language: options.language || null,
      responseFormat: 'verbose_json',
      temperature: 0
    }, transcriptionProgress);
    console.log(`[PIPELINE] Transcription done: ${transcriptionResult.segments?.length || 0} segments`);
    await updateProjectProgress(projectId, 'transcribing', 60);

    // === Step 3: Analyze with DeepSeek ===
    const autoMaxClips = options.maxClips || calculateMaxClips(metadata.duration);
    console.log(`[PIPELINE] Starting DeepSeek analysis (maxClips: ${autoMaxClips}, duration: ${Math.round(metadata.duration / 60)}min)...`);
    await updateProjectProgress(projectId, 'analyzing', 62);

    const analysisResult = await analyzeContentWithDeepSeek(transcriptionResult, {
      minClipDuration: options.minClipDuration || 15,
      maxClipDuration: options.maxClipDuration || 60,
      maxClips: autoMaxClips,
      videoTitle: metadata.title || 'Video',
      videoType: options.videoType || 'general'
    });
    console.log(`[PIPELINE] Analysis done: ${analysisResult.clips.length} clips found`);
    await updateProjectProgress(projectId, 'analyzing', 80);

    // === Step 4: Save clips to database ===
    if (analysisResult.clips.length === 0) {
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'completed', processingCompleted: new Date(),
          'analytics.totalClipsGenerated': 0, 'analytics.processingStage': 'completed',
          'analytics.progressPercentage': 100, 'analytics.warning': 'No clips met the quality threshold'
        }
      });
      cleanupFile(downloadResult.filePath);
      console.log(`[PIPELINE] No clips found for project ${projectId}`);
      return;
    }

    await updateProjectProgress(projectId, 'saving', 82);

    const clipData = analysisResult.clips.map((clip, index) => ({
      projectId, userId,
      title: clip.title || `${metadata.title} - Clip ${index + 1}`,
      templateHeader: clip.templateHeader || clip.title,
      startTime: clip.startTime, endTime: clip.endTime, duration: clip.duration,
      viralityScore: clip.viralityScore,
      status: 'ready', templateStatus: 'ready',
      aiAnalysis: {
        source: 'deepseek-v3', reason: clip.reason,
        engagementType: clip.engagementType, contentTags: clip.contentTags || [],
        hasSetup: clip.hasSetup, hasPayoff: clip.hasPayoff, analyzedAt: clip.analyzedAt
      }
    }));

    const savedClips = await VideoClip.insertMany(clipData);
    console.log(`[PIPELINE] Saved ${savedClips.length} clips to database`);

    // Save transcription + analysis to project
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: {
        status: 'processing', processingCompleted: new Date(),
        'analytics.totalClipsGenerated': savedClips.length,
        transcription: {
          text: transcriptionResult.text, language: transcriptionResult.language,
          segments: transcriptionResult.segments, duration: transcriptionResult.duration,
          source: 'whisper', processingCost: transcriptionResult.estimatedCost, processedAt: new Date()
        },
        aiAnalysis: {
          model: 'deepseek-chat-v3', totalCost: analysisResult.cost,
          processingTime: analysisResult.processingTime, analyzedAt: new Date()
        }
      }
    });

    // === Step 5: Cut clips and upload to Firebase ===
    console.log(`[PIPELINE] Starting clip cutting for ${savedClips.length} clips...`);
    await updateProjectProgress(projectId, 'cutting', 82);

    const clipsList = savedClips.map(clip => ({
      _id: clip._id, startTime: clip.startTime, endTime: clip.endTime,
      title: clip.title, duration: clip.duration, viralityScore: clip.viralityScore
    }));

    // Per-clip progress: maps cutting 0-N into pipeline 82-98%
    const originalProcessClips = processClipsFromMetadata;
    const processedClips = [];
    for (let i = 0; i < clipsList.length; i++) {
      const clipMeta = clipsList[i];
      const clipPct = Math.round(82 + ((i + 1) / clipsList.length) * 16); // 82% to 98%
      console.log(`[PIPELINE] Cutting clip ${i + 1}/${clipsList.length}: ${clipMeta.startTime}s - ${clipMeta.endTime}s`);

      try {
        // Cut vertical (9:16)
        const videoResultVertical = await cutVideoClip(downloadResult.filePath, clipMeta.startTime, clipMeta.endTime, PROCESSING_DIR, {
          aspectRatio: '9:16', platform: 'vertical'
        });
        // Cut horizontal (2.35:1)
        const videoResultHorizontal = await cutVideoClip(downloadResult.filePath, clipMeta.startTime, clipMeta.endTime, PROCESSING_DIR, {
          aspectRatio: '2.35:1', platform: 'cinematic'
        });
        // Extract preview
        const previewResult = await extractPreviewSegment(
          downloadResult.filePath, clipMeta.startTime, clipMeta.endTime, clipMeta._id, PROCESSING_DIR
        );
        // Upload both clips to Firebase
        const verticalUpload = await uploadClipToFirebase(
          videoResultVertical.filePath, `${projectId}_clip_${clipMeta.startTime}s_9x16`
        );
        const horizontalUpload = await uploadClipToFirebase(
          videoResultHorizontal.filePath, `${projectId}_clip_${clipMeta.startTime}s_2.35x1`
        );
        // Cleanup local clip files
        try { fs.unlinkSync(videoResultVertical.filePath); fs.unlinkSync(videoResultHorizontal.filePath); } catch (e) { /* ignore */ }

        processedClips.push({
          clipId: clipMeta._id, title: clipMeta.title || `${metadata.title} - ${clipMeta.startTime}s`,
          startTime: clipMeta.startTime, endTime: clipMeta.endTime,
          duration: clipMeta.duration, viralityScore: clipMeta.viralityScore,
          generatedVideo: {
            vertical: { url: verticalUpload.downloadURL, format: 'mp4', size: videoResultVertical.size, duration: videoResultVertical.duration, resolution: '720p', aspectRatio: '9:16' },
            horizontal: { url: horizontalUpload.downloadURL, format: 'mp4', size: videoResultHorizontal.size, duration: videoResultHorizontal.duration, resolution: '720p', aspectRatio: '2.35:1' },
            url: verticalUpload.downloadURL, format: 'mp4', size: videoResultVertical.size, duration: videoResultVertical.duration, resolution: '720p'
          },
          previewVideo: { url: previewResult.url, format: 'mp4', size: previewResult.size, duration: previewResult.duration }
        });
      } catch (error) {
        console.error(`[PIPELINE] Clip ${i + 1} failed:`, error.message);
        processedClips.push({
          clipId: clipMeta._id, title: `Error: ${clipMeta.title || 'Processing failed'}`,
          startTime: clipMeta.startTime, endTime: clipMeta.endTime,
          duration: clipMeta.duration, viralityScore: clipMeta.viralityScore,
          error: error.message, generatedVideo: null
        });
      }

      await updateProjectProgress(projectId, 'cutting', clipPct);
    }

    // Update clip records with Firebase URLs
    let successfulUpdates = 0;
    for (const pc of processedClips) {
      if (!pc.error) {
        try {
          await VideoClip.findByIdAndUpdate(pc.clipId, {
            $set: { title: pc.title, generatedVideo: pc.generatedVideo, previewVideo: pc.previewVideo, status: 'ready' }
          });
          successfulUpdates++;
        } catch (e) {
          console.error(`[PIPELINE] Failed to update clip ${pc.clipId}:`, e.message);
        }
      }
    }

    // === Step 6: Mark complete ===
    await updateProjectProgress(projectId, 'completed', 100);
    await VideoProject.findByIdAndUpdate(projectId, {
      $set: {
        status: 'completed', 'analytics.processingStage': 'completed',
        'analytics.totalClipsGenerated': successfulUpdates,
        'analytics.lastAccessed': new Date()
      }
    });

    console.log(`[PIPELINE] Project ${projectId} completed with ${successfulUpdates} clips ready`);

    // Cleanup downloaded video
    cleanupFile(downloadResult.filePath);

  } catch (error) {
    console.error(`[PIPELINE] Failed for project ${projectId}:`, error.message);
    try {
      // Convert raw technical errors to user-friendly messages
      const userMessage = getUserFriendlyError(error.message);
      await VideoProject.findByIdAndUpdate(projectId, {
        $set: {
          status: 'error', processingCompleted: new Date(),
          'analytics.processingStage': 'error', 'analytics.progressPercentage': 0,
          'analytics.progressMessage': userMessage,
          'analytics.error': error.message, // Keep raw error for debugging
          'analytics.lastUpdated': new Date()
        }
      });
    } catch (e) {
      console.error(`[PIPELINE] Failed to update error status:`, e.message);
    }
  } finally {
    processingLocks.delete(projectId);
    pipelineSemaphore.release();
    console.log(`[PIPELINE] Released lock for project ${projectId} (active: ${pipelineSemaphore.active}, waiting: ${pipelineSemaphore.waiting})`);
  }
});

// ============================================
// Font Manager (ported from fontManager.js)
// ============================================
const FONTS_DIR = '/app/fonts';

const FONT_WEIGHTS = {
  light: { weight: '300', bold: '0' },
  normal: { weight: '400', bold: '0' },
  medium: { weight: '500', bold: '0' },
  semibold: { weight: '600', bold: '-1' },
  bold: { weight: '700', bold: '1' },
  extrabold: { weight: '800', bold: '1' }
};

const FONT_SIZES = {
  verysmall: { size: '27', scale: 1.0 },
  small: { size: '33', scale: 1.2 },
  medium: { size: '39', scale: 1.5 },
  large: { size: '49', scale: 1.8 }
};

const CAPTION_FONTS = {
  raleway: { name: 'Raleway', ffmpegFont: 'Raleway', fontFile: 'Raleway-Regular.ttf', boldFile: 'Raleway-Bold.ttf', description: 'Elegant & Modern' },
  inter: { name: 'Inter', ffmpegFont: 'Inter', fontFile: 'Inter-Regular.ttf', boldFile: 'Inter-Bold.ttf', description: 'Digital & Clean' },
  bebasNeue: { name: 'Bebas Neue', ffmpegFont: 'Bebas Neue', fontFile: 'BebasNeue-Regular.ttf', boldFile: 'BebasNeue-Regular.ttf', description: 'Bold & Condensed' },
  montserrat: { name: 'Montserrat', ffmpegFont: 'Montserrat', fontFile: 'Montserrat-Regular.ttf', boldFile: 'Montserrat-Bold.ttf', description: 'Clean & Modern' },
  anton: { name: 'Anton', ffmpegFont: 'Anton', fontFile: 'Anton-Regular.ttf', boldFile: 'Anton-Regular.ttf', description: 'Heavy & Impactful' },
  oswald: { name: 'Oswald', ffmpegFont: 'Oswald', fontFile: 'Oswald-Regular.ttf', boldFile: 'Oswald-Bold.ttf', description: 'Tall & Narrow' },
  roboto: { name: 'Roboto', ffmpegFont: 'Roboto', fontFile: 'Roboto-Regular.ttf', boldFile: 'Roboto-Bold.ttf', description: 'Standard & Reliable' }
};

function isFontSupported(fontKey) {
  return Object.prototype.hasOwnProperty.call(CAPTION_FONTS, fontKey);
}

function getFontConfigForFFmpeg(fontKey) {
  const font = CAPTION_FONTS[fontKey] || CAPTION_FONTS.roboto;
  return { fontname: font.ffmpegFont, name: font.name, description: font.description };
}

function generateFFmpegForceStyle(captionSettings, videoDimensions = { width: 1080, height: 1920 }) {
  const { font = 'roboto', size = 'medium', weight = 'normal', position = 'bottom' } = captionSettings;
  const fontConfig = CAPTION_FONTS[font] || CAPTION_FONTS.roboto;
  const fontWeight = FONT_WEIGHTS[weight] || FONT_WEIGHTS.normal;
  const fontSize = FONT_SIZES[size] || FONT_SIZES.medium;

  const styleParams = [
    `PlayResX=${videoDimensions.width}`, `PlayResY=${videoDimensions.height}`,
    `FontName=${fontConfig.ffmpegFont}`, `FontSize=${fontSize.size}`, `Bold=${fontWeight.bold}`,
    `PrimaryColour=&Hffffff&`, `OutlineColour=&H000000&`,
    `Outline=0`, `Shadow=0`, `BorderStyle=0`
  ];

  if (position === 'top') {
    styleParams.push('Alignment=2', 'MarginV=1650');
  } else if (position === 'center') {
    styleParams.push('Alignment=2', 'MarginV=900');
  } else {
    styleParams.push('Alignment=2', 'MarginV=50');
  }

  return styleParams.join(',');
}

// ============================================
// Caption Service (ported from captionService.js)
// ============================================

function generateCaptionData(words, options = {}) {
  const { maxWordsPerLine = 3, minDisplayTime = 0.5, platform = 'tiktok', fontSize = 40, fontColor = 'white', outlineColor = 'black', backgroundColor = 'transparent' } = options;

  if (!words || words.length === 0) return { captions: [], totalDuration: 0 };

  const captions = [];
  let currentCaption = { words: [], startTime: null, endTime: null, text: '' };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (currentCaption.words.length === 0) {
      currentCaption.startTime = word.start;
      currentCaption.words.push(word);
      currentCaption.text = word.word;
    } else if (currentCaption.words.length < maxWordsPerLine) {
      currentCaption.words.push(word);
      currentCaption.text += ' ' + word.word;
      currentCaption.endTime = word.end;
    } else {
      currentCaption.endTime = currentCaption.words[currentCaption.words.length - 1].end;
      const displayTime = currentCaption.endTime - currentCaption.startTime;
      if (displayTime < minDisplayTime) currentCaption.endTime = currentCaption.startTime + minDisplayTime;
      captions.push({ ...currentCaption });
      currentCaption = { words: [word], startTime: word.start, endTime: word.end, text: word.word };
    }
  }

  if (currentCaption.words.length > 0) {
    currentCaption.endTime = currentCaption.words[currentCaption.words.length - 1].end;
    const displayTime = currentCaption.endTime - currentCaption.startTime;
    if (displayTime < minDisplayTime) currentCaption.endTime = currentCaption.startTime + minDisplayTime;
    captions.push(currentCaption);
  }

  const totalDuration = captions.length > 0 ? captions[captions.length - 1].endTime : 0;
  console.log(`[CAPTIONS] Generated ${captions.length} caption segments, total: ${totalDuration.toFixed(1)}s`);

  return { captions, totalDuration, platform, styling: { fontSize, fontColor, outlineColor, backgroundColor } };
}

function formatWebVTTTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function generateWebVTTContent(captionData) {
  if (!captionData.captions || captionData.captions.length === 0) return '';
  let content = 'WEBVTT\n\n';
  captionData.captions.forEach((caption, index) => {
    content += `${index + 1}\n${formatWebVTTTimestamp(caption.startTime)} --> ${formatWebVTTTimestamp(caption.endTime)} align:middle\n${caption.text}\n\n`;
  });
  return content;
}

function getPlatformStyling(platform) {
  const styles = {
    tiktok: { fontSize: 48, fontColor: 'white', outlineColor: 'black', outlineWidth: 3 },
    instagram: { fontSize: 44, fontColor: 'white', outlineColor: 'black', outlineWidth: 2 },
    youtube: { fontSize: 40, fontColor: 'white', outlineColor: 'black', outlineWidth: 2 },
    default: { fontSize: 42, fontColor: 'white', outlineColor: 'black', outlineWidth: 2 }
  };
  return styles[platform] || styles.default;
}

async function getVideoDimensions(videoPath) {
  const { stdout } = await execAsync(
    `${FFPROBE_PATH} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`
  );
  const dims = stdout.trim().split(',');
  if (dims.length !== 2) throw new Error(`Failed to parse video dimensions: ${stdout}`);
  return { width: parseInt(dims[0], 10), height: parseInt(dims[1], 10) };
}

async function burnSubtitlesIntoVideo(inputVideoPath, captionData, captionSettings, outputPath, options = {}) {
  const videoDimensions = await getVideoDimensions(inputVideoPath);
  const webvttContent = generateWebVTTContent(captionData);
  if (!webvttContent) throw new Error('Failed to generate WebVTT content');

  const tempDir = options.tempDir || PROCESSING_DIR;
  const webvttPath = path.join(tempDir, `subtitles_${Date.now()}.vtt`);
  fs.writeFileSync(webvttPath, webvttContent, 'utf8');

  const forceStyle = generateFFmpegForceStyle(captionSettings, videoDimensions);
  console.log(`[SUBTITLE-BURN] Using force_style: ${forceStyle}`);

  const ffmpegArgs = [
    '-i', inputVideoPath,
    '-vf', `subtitles=${webvttPath}:fontsdir=${FONTS_DIR}:force_style='${forceStyle}'`,
    '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'medium', '-crf', '23',
    '-y', outputPath
  ];

  try {
    await runCommandWithTimeout(FFMPEG_PATH, ffmpegArgs, { timeout: 600000, label: 'Subtitle burn' });
    console.log(`[SUBTITLE-BURN] Successfully burned subtitles into video`);
    return outputPath;
  } finally {
    try { fs.unlinkSync(webvttPath); } catch (e) { /* ignore */ }
  }
}

async function applyCaptionsWithFont(inputVideoPath, captionData, fontKey, outputPath, options = {}) {
  const fontConfig = getFontConfigForFFmpeg(fontKey);
  const styling = getPlatformStyling(captionData.platform || 'tiktok');
  const { position = 'bottom' } = options;

  let yPosition;
  if (position === 'top') yPosition = '150';
  else if (position === 'center') yPosition = '(h-text_h)/2';
  else yPosition = 'h-text_h-150';

  const tempDir = PROCESSING_DIR;
  const textFiles = [];
  const filters = [];

  captionData.captions.forEach((caption, index) => {
    const textFilePath = path.join(tempDir, `caption_${Date.now()}_${index}.txt`);
    fs.writeFileSync(textFilePath, caption.text.trim(), 'utf8');
    textFiles.push(textFilePath);
    filters.push(`drawtext=textfile='${textFilePath}':x=(w-text_w)/2:y=${yPosition}:font='${fontConfig.fontname}':fontsize=${styling.fontSize}:fontcolor=${styling.fontColor}:bordercolor=${styling.outlineColor}:borderw=${styling.outlineWidth}:enable='between(t,${caption.startTime},${caption.endTime})'`);
  });

  const filterScriptPath = path.join(tempDir, `font_caption_filter_${Date.now()}.txt`);
  fs.writeFileSync(filterScriptPath, `[0:v]${filters.join(',')}[v]`, 'utf8');

  const ffmpegArgs = [
    '-i', inputVideoPath,
    '-filter_complex_script', filterScriptPath,
    '-map', '[v]', '-map', '0:a',
    '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'medium', '-crf', '23',
    '-y', outputPath
  ];

  try {
    await runCommandWithTimeout(FFMPEG_PATH, ffmpegArgs, { timeout: 600000, label: `Caption font ${fontKey}` });
    console.log(`[CAPTIONS] Successfully applied captions with font: ${fontKey}`);
    return outputPath;
  } finally {
    try { fs.unlinkSync(filterScriptPath); } catch (e) { /* ignore */ }
    textFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) { /* ignore */ } });
  }
}

// ============================================
// Template Rendering (ported from download-video-with-template/route.js)
// ============================================

function generateTemplateHTML(templateData) {
  const { template, title, plainTitle, templateHeader, settings = {} } = templateData;
  const templatesWithCustomTitles = ['social-profile', 'title-only'];
  const shouldUseTemplateHeader = templatesWithCustomTitles.includes(template?.toLowerCase());

  let displayText;
  if (shouldUseTemplateHeader && templateHeader) displayText = templateHeader;
  else displayText = title || plainTitle || '';

  const textColor = (settings.textColor && settings.textColor !== '') ? settings.textColor : '#ffffff';
  const username = (settings.username && settings.username.trim()) ? settings.username : 'username';
  const isBWTemplate = template === 'bw-frame' || template === 'black-and-white' || template === 'bw';
  const logoSource = isBWTemplate ? settings.customImage : settings.profilePic;
  const hasCustomLogo = logoSource && logoSource !== '';

  const baseStyle = `body { margin: 0; padding: 0; font-family: "Helvetica Neue", Roboto, "Segoe UI", Arial, sans-serif; } .container { position: relative; width: 100%; height: 100%; overflow: hidden; }`;

  if (template === 'default' || template === 'blank') {
    return `<html><head><style>${baseStyle}</style></head><body><div class="container"></div></body></html>`;
  } else if (template === 'social-profile') {
    return `<html><head><style>${baseStyle}
      .profile-overlay { position: absolute; top: 50%; left: 24px; right: 24px; transform: translateY(-600%); background: rgba(0,0,0,0); display: flex; flex-direction: column; }
      .user-info { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
      .user-avatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,1.0); flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .user-text { display: flex; flex-direction: column; gap: 2px; }
      .username { color: ${textColor}; font-size: 20px; font-weight: 700; font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.2; display: flex; align-items: center; gap: 6px; }
      .checkmark { width: 20px; height: 20px; background: #1DA1F2; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .checkmark::after { content: "\\2713"; color: white; font-size: 12px; font-weight: bold; }
      .handle { color: ${textColor}; font-size: 15px; font-weight: 400; opacity: 0.7; line-height: 1.2; }
      .title { color: ${textColor}; font-size: 24px; font-weight: 700; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.3); max-width: 100%; word-wrap: break-word; }
    </style></head><body><div class="container"><div class="profile-overlay">
      <div class="user-info">
        <div class="user-avatar">${hasCustomLogo ? `<img src="${logoSource}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="color:rgba(255,255,255,0.8);font-size:16px;">&#128100;</div>`}</div>
        <div class="user-text"><div class="username">${username}<div class="checkmark"></div></div><div class="handle">@${username}</div></div>
      </div>
      <div class="title">${displayText}</div>
    </div></div></body></html>`;
  } else if (template === 'title-only') {
    return `<html><head><style>${baseStyle}
      .title-overlay { position: absolute; top: 50%; left: 24px; right: 24px; transform: translateY(-1300%); background: rgba(0,0,0,0); display: flex; flex-direction: column; }
      .title { color: ${textColor}; font-size: 28px; font-weight: 700; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.3); max-width: 100%; word-wrap: break-word; text-align: center; }
    </style></head><body><div class="container"><div class="title-overlay"><div class="title">${displayText}</div></div></div></body></html>`;
  } else if (template === 'bw-frame') {
    return `<html><head><style>${baseStyle}
      .bottom-logo { position: absolute; bottom: 200px; left: 50%; transform: translateX(-50%); }
      .logo-placeholder { width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); font-size: 32px; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
      .logo-image { height: 360px; max-width: 750px; object-fit: contain; }
    </style></head><body><div class="container"><div class="bottom-logo">
      ${hasCustomLogo ? `<img src="${logoSource}" alt="Logo" class="logo-image" />` : `<div class="logo-placeholder">logo</div>`}
    </div></div></body></html>`;
  }

  // Default fallback
  return `<html><head><style>${baseStyle}
    .overlay { position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); padding: 12px 20px; border-radius: 8px; }
    .title { color: white; font-size: 20px; font-weight: bold; text-align: center; }
  </style></head><body><div class="container"><div class="overlay"><div class="title">${displayText}</div></div></div></body></html>`;
}

async function renderTemplateToImage(templateData) {
  console.log(`[PUPPETEER] Launching browser for template rendering...`);
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    const width = templateData.aspectRatio === 'vertical' ? 1080 : 1920;
    const height = templateData.aspectRatio === 'vertical' ? 1920 : 1080;
    await page.setViewport({ width, height });

    const html = generateTemplateHTML(templateData);
    await page.setContent(html, { waitUntil: 'load' });

    const screenshot = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width, height } });
    console.log(`[PUPPETEER] Template rendered to PNG (${screenshot.length} bytes)`);
    return screenshot;
  } finally {
    await browser.close().catch(e => console.warn('[PUPPETEER] Close warning:', e.message));
  }
}

async function overlayImageOnVideo(inputVideoPath, overlayImagePath, outputVideoPath, templateData = {}) {
  const backgroundColor = (templateData.settings?.overlayColor && templateData.settings.overlayColor !== '') ? templateData.settings.overlayColor : '#000000';
  const isBlankTemplate = templateData.template === 'default' || templateData.template === 'blank';
  const isBWTemplate = templateData.template === 'bw-frame' || templateData.template === 'black-and-white' || templateData.template === 'bw';
  const bwContrast = templateData.settings?.bwContrast || 130;
  const bwBrightness = templateData.settings?.bwBrightness || 80;

  let filterComplex;
  if (isBlankTemplate) {
    filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black[output]`;
  } else if (isBWTemplate) {
    filterComplex =
      `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}[scaled_video_temp];` +
      `[scaled_video_temp]colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0:0:0:0:1[bw_temp];` +
      `[bw_temp]eq=contrast=${bwContrast / 100}:brightness=${(bwBrightness - 100) / 100}[bw_video];` +
      `[bw_video][1:v]overlay=0:0[output]`;
  } else {
    filterComplex =
      `[0:v]scale=1080:800:force_original_aspect_ratio=increase,crop=1080:800[scaled_video_temp];` +
      `[scaled_video_temp]pad=1080:1920:0:(oh-ih)/2:color=${backgroundColor}[scaled_video];` +
      `[scaled_video][1:v]overlay=0:0[output]`;
  }

  const args = isBlankTemplate
    ? ['-i', inputVideoPath, '-filter_complex', filterComplex, '-map', '[output]', '-map', '0:a', '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-y', outputVideoPath]
    : ['-i', inputVideoPath, '-i', overlayImagePath, '-filter_complex', filterComplex, '-map', '[output]', '-map', '0:a', '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-y', outputVideoPath];

  await runCommandWithTimeout(FFMPEG_PATH, args, { timeout: 600000, label: 'Template overlay' });
  console.log(`[TEMPLATE] Video overlay completed successfully`);
  return outputVideoPath;
}

// ============================================
// POST /apply-captions — Apply font captions to a video
// ============================================
app.post('/apply-captions', async (req, res) => {
  const { videoUrl, captionData, fontKey = 'roboto', clipId, position = 'bottom' } = req.body;

  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
  if (!captionData?.captions?.length) return res.status(400).json({ error: 'captionData with captions array is required' });
  if (!isFontSupported(fontKey)) return res.status(400).json({ error: `Unsupported font: ${fontKey}` });

  const timestamp = Date.now();
  const inputPath = path.join(PROCESSING_DIR, `input_caption_${timestamp}.mp4`);
  const outputPath = path.join(PROCESSING_DIR, `output_caption_${timestamp}_${fontKey}.mp4`);

  try {
    // Download video from URL
    console.log(`[APPLY-CAPTIONS] Downloading video for caption application...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    console.log(`[APPLY-CAPTIONS] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    // Apply captions with selected font
    await applyCaptionsWithFont(inputPath, captionData, fontKey, outputPath, { position, videoWidth: 1080, videoHeight: 1920 });

    if (!fs.existsSync(outputPath)) throw new Error('Processed video file not found');

    // Upload result to Firebase
    let resultUrl = null;
    if (storageBucket) {
      const uploadResult = await retryWithBackoff(
        () => uploadClipToFirebase(outputPath, `caption_${clipId || timestamp}_${fontKey}`),
        { maxRetries: 3, label: 'Firebase caption upload' }
      );
      resultUrl = uploadResult.downloadURL;
      console.log(`[APPLY-CAPTIONS] Uploaded to Firebase: ${resultUrl}`);
    }

    res.json({ success: true, url: resultUrl, fontKey, clipId });
  } catch (error) {
    console.error(`[APPLY-CAPTIONS] Error:`, error.message);
    res.status(500).json({ error: error.message });
  } finally {
    cleanupFile(inputPath);
    cleanupFile(outputPath);
  }
});

// ============================================
// POST /process-template — Render template + overlay + optional captions
// ============================================
app.post('/process-template', async (req, res) => {
  const { videoUrl, templateData, captionData, captionSettings } = req.body;

  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
  if (!templateData?.template) return res.status(400).json({ error: 'templateData with template is required' });

  const timestamp = Date.now();
  const inputPath = path.join(PROCESSING_DIR, `input_template_${timestamp}.mp4`);
  const overlayPath = path.join(PROCESSING_DIR, `overlay_${timestamp}.png`);
  const outputPath = path.join(PROCESSING_DIR, `output_template_${timestamp}.mp4`);
  const captionBurnPath = path.join(PROCESSING_DIR, `caption_burned_${timestamp}.mp4`);
  const filesToCleanup = [inputPath, overlayPath, outputPath, captionBurnPath];

  try {
    // Download source video
    console.log(`[PROCESS-TEMPLATE] Downloading source video...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    console.log(`[PROCESS-TEMPLATE] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    const isBlankTemplate = templateData.template === 'default' || templateData.template === 'blank';

    // Render template overlay if not blank
    if (!isBlankTemplate) {
      console.log(`[PROCESS-TEMPLATE] Rendering template: ${templateData.template}`);
      const overlayBuffer = await renderTemplateToImage(templateData);
      fs.writeFileSync(overlayPath, overlayBuffer);
    }

    // Overlay template on video
    console.log(`[PROCESS-TEMPLATE] Applying FFmpeg overlay...`);
    await overlayImageOnVideo(inputPath, overlayPath, outputPath, templateData);

    // Optionally burn captions
    let finalVideoPath = outputPath;
    if (captionData?.captions?.length && captionSettings) {
      console.log(`[PROCESS-TEMPLATE] Burning ${captionData.captions.length} captions with font: ${captionSettings.font}`);
      try {
        await burnSubtitlesIntoVideo(outputPath, captionData, captionSettings, captionBurnPath, { tempDir: PROCESSING_DIR });
        finalVideoPath = captionBurnPath;
        console.log(`[PROCESS-TEMPLATE] Captions burned successfully`);
      } catch (captionError) {
        console.error(`[PROCESS-TEMPLATE] Caption burning failed:`, captionError.message);
        // Continue without captions rather than failing entirely
      }
    }

    // Upload to Firebase
    if (storageBucket) {
      const uploadResult = await retryWithBackoff(
        () => uploadClipToFirebase(finalVideoPath, `template_${timestamp}`),
        { maxRetries: 3, label: 'Firebase template upload' }
      );
      console.log(`[PROCESS-TEMPLATE] Uploaded to Firebase: ${uploadResult.downloadURL}`);
      res.json({ success: true, url: uploadResult.downloadURL });
    } else {
      // Return video as binary response if no Firebase
      const videoBuffer = fs.readFileSync(finalVideoPath);
      res.set({ 'Content-Type': 'video/mp4', 'Content-Length': videoBuffer.length });
      res.send(videoBuffer);
    }
  } catch (error) {
    console.error(`[PROCESS-TEMPLATE] Error:`, error.message);
    res.status(500).json({ error: error.message });
  } finally {
    filesToCleanup.forEach(f => cleanupFile(f));
  }
});

// ============================================
// POST /process-video — General FFmpeg operations
// ============================================
app.post('/process-video', async (req, res) => {
  const { videoUrl, operation, options = {} } = req.body;

  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
  if (!operation) return res.status(400).json({ error: 'operation is required' });

  const timestamp = Date.now();
  const inputPath = path.join(PROCESSING_DIR, `input_process_${timestamp}.mp4`);
  const outputPath = path.join(PROCESSING_DIR, `output_process_${timestamp}.mp4`);

  try {
    // Download video
    console.log(`[PROCESS-VIDEO] Downloading video for operation: ${operation}`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    let ffmpegArgs;
    let finalOutput = outputPath;

    switch (operation) {
      case 'cut': {
        const { startTime = 0, endTime, duration } = options;
        const dur = duration || (endTime ? endTime - startTime : 30);
        ffmpegArgs = ['-ss', String(startTime), '-i', inputPath, '-t', String(dur), '-c', 'copy', '-y', outputPath];
        break;
      }
      case 'resize': {
        const { width = 1080, height = 1920, platform } = options;
        let scale;
        if (platform === 'tiktok' || platform === 'reels' || platform === 'shorts') scale = '1080:1920';
        else if (platform === 'twitter') scale = '1280:720';
        else scale = `${width}:${height}`;
        ffmpegArgs = ['-i', inputPath, '-vf', `scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2`, '-c:v', 'libx264', '-c:a', 'aac', '-y', outputPath];
        break;
      }
      case 'extract-audio': {
        finalOutput = outputPath.replace('.mp4', '.mp3');
        ffmpegArgs = ['-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-ab', '192k', '-y', finalOutput];
        break;
      }
      default:
        return res.status(400).json({ error: `Unsupported operation: ${operation}` });
    }

    await runCommandWithTimeout(FFMPEG_PATH, ffmpegArgs, { timeout: 600000, label: `Process-video ${operation}` });

    if (!fs.existsSync(finalOutput)) throw new Error('Output file not created');

    if (storageBucket) {
      const uploadResult = await retryWithBackoff(
        () => uploadClipToFirebase(finalOutput, `processed_${operation}_${timestamp}`),
        { maxRetries: 3, label: 'Firebase process upload' }
      );
      res.json({ success: true, url: uploadResult.downloadURL, operation });
    } else {
      const videoBuffer = fs.readFileSync(finalOutput);
      res.set({ 'Content-Type': operation === 'extract-audio' ? 'audio/mpeg' : 'video/mp4', 'Content-Length': videoBuffer.length });
      res.send(videoBuffer);
    }
  } catch (error) {
    console.error(`[PROCESS-VIDEO] Error:`, error.message);
    res.status(500).json({ error: error.message });
  } finally {
    cleanupFile(inputPath);
    cleanupFile(outputPath);
    cleanupFile(outputPath.replace('.mp4', '.mp3'));
  }
});

// ============================================
// GET /fonts — List available fonts
// ============================================
app.get('/fonts', (req, res) => {
  const fonts = Object.entries(CAPTION_FONTS).map(([key, font]) => ({
    key, name: font.name, description: font.description
  }));
  res.json({ fonts, defaultFont: 'roboto', count: fonts.length });
});

// ============================================
// Start Server
// ============================================
initializeFirebase();

// Connect to MongoDB at startup (non-blocking)
connectMongo().catch(err => console.warn('[STARTUP] MongoDB connection deferred:', err.message));

// Start cleanup cron
startCleanupCron();

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
║  MongoDB:     ${MONGODB_URI ? 'Configured' : 'Not configured'}                                ║
║  OpenAI:      ${OPENAI_API_KEY ? 'Configured' : 'Not configured'}                                ║
║  DeepSeek:    ${DEEPSEEK_API_KEY ? 'Configured' : 'Not configured'}                                ║
╚══════════════════════════════════════════════════════════════╝

Endpoints:
  GET  /health                   - Health check
  GET  /progress/:projectId      - SSE real-time progress
  GET  /fonts                    - List available caption fonts
  POST /metadata                 - Get video metadata
  POST /download                 - Download video
  POST /download-with-metadata   - Download with metadata
  POST /formats                  - List available formats
  POST /extract-frame            - Extract frame as thumbnail
  POST /process-clips-pipeline   - Full clip detection pipeline
  POST /apply-captions           - Apply font captions to video
  POST /process-template         - Template overlay + captions
  POST /process-video            - General FFmpeg operations
  POST /cleanup                  - Delete temp file
`);
});

export default app;
