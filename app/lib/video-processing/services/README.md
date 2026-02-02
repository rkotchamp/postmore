# Video Processing Services - Complete Workflow

This directory contains the core services for transforming long-form videos into viral short clips. The system uses a sophisticated pipeline that downloads videos, extracts audio, transcribes content, analyzes for viral moments, and generates optimized clips.

## 🎬 Complete Workflow Overview

```
📹 Long Video URL → 🔽 Download → 🎵 Audio Extraction → 📝 Transcription → 🧠 AI Analysis → ✂️ Viral Clips
```

### Step-by-Step Process

1. **Video Download** → Extract audio chunks → **Whisper Transcription** → **DeepSeek Analysis** → **Clip Generation**

---

## 📂 Core Services & Files

### 1. 🔽 **Video Download** 
**File: `videoDownloadService.js`**
- **Purpose**: Downloads long-form videos from various platforms
- **Technology**: Uses `yt-dlp` for robust video downloading
- **Platforms Supported**: YouTube, Twitch, Kick, Rumble, TikTok, Instagram, Vimeo
- **Features**:
  - Platform detection and optimization
  - Metadata extraction (title, duration, uploader)
  - Quality selection (default: best ≤1080p)
  - Error handling and retries

**Key Functions**:
- `downloadVideo(url, options)` - Downloads video file
- `downloadVideoWithMetadata(url, options)` - Downloads with metadata
- `getVideoMetadata(url)` - Gets video info without downloading

---

### 2. 🎵 **Audio Extraction & Chunking**
**File: `audioChunkingService.js`**
- **Purpose**: Handles large video files by chunking them for Whisper processing
- **Reason**: Whisper API has 25MB file size limit
- **Process**:
  1. Checks if video exceeds 25MB limit
  2. Extracts audio as compressed MP3 (128k bitrate, 22050Hz)
  3. Splits into 10-minute chunks with proper overlap
  4. Ensures each chunk is under 25MB for Whisper

**Key Functions**:
- `chunkVideoForWhisper(videoPath)` - Main chunking orchestrator
- `extractAudio(videoPath, outputPath)` - Audio extraction with compression
- `splitAudioIntoChunks(audioPath, outputDir)` - Creates time-based chunks
- `cleanupChunks(chunkDirectory)` - Cleanup temporary files

---

### 3. 🎙️ **Speech-to-Text Transcription**
**Files: `transcriptionService.js` + `openaiWhisperService.js`**
- **Technology**: OpenAI Whisper API with intelligent chunking
- **Features**:
  - Automatic chunking for large files
  - Word-level and segment-level timestamps
  - Multi-language support with auto-detection
  - Retry logic with exponential backoff
  - Cost estimation and tracking

**Key Functions**:
- `transcribeWithWhisper(filePath, options)` - Main transcription function
- `transcribeSingleFile(filePath, options)` - Single file processing
- `findInterestingMoments(transcription, options)` - Basic moment detection

**Processing Flow**:
1. Check if file needs chunking (>25MB)
2. If chunked: Process each chunk separately, adjust timestamps
3. If single: Direct Whisper API call
4. Return combined results with word-level timestamps

---

### 4. 🧠 **AI Content Analysis**
**File: `deepseekAnalysisService.js`**
- **Technology**: DeepSeek-Chat V3 for intelligent viral moment detection
- **Purpose**: Analyzes transcripts to identify the most viral-worthy segments
- **Features**:
  - 4-D Methodology: Deconstruct → Diagnose → Develop → Deliver
  - MapReduce processing for long transcripts (>100K tokens)
  - Dynamic clip duration (15-60 seconds)
  - Virality scoring (0-100 scale)
  - Dual text generation: SEO titles + social media hooks

**Analysis Criteria**:
- ✅ Emotional peaks (shock, joy, surprise, anger)
- ✅ Plot twists and contradictions
- ✅ Universal relatability
- ✅ Quotable wisdom/controversial takes
- ✅ Educational breakthroughs
- ✅ "Did they just say that?" moments

**Key Functions**:
- `analyzeContentWithDeepSeek(transcription, options)` - Main analysis
- `analyzeWithMapReduce(transcription, options)` - For long content
- `callDeepSeekAPI(prompt)` - API interaction
- `calculateDeepSeekCost(prompt, response)` - Cost tracking

---

### 5. ✂️ **Clip Generation & Processing**
**File: `clipCuttingService.js`**
- **Technology**: FFmpeg for video processing
- **Purpose**: Creates final viral clips with multiple aspect ratios
- **Features**:
  - Dual aspect ratio output (9:16 vertical + 2.35:1 cinematic)
  - Smart captions with word-level timing
  - Platform optimization (TikTok, Instagram, YouTube Shorts)
  - Preview generation for templates
  - Firebase cloud storage upload

**Key Functions**:
- `cutVideoClip(inputPath, startTime, endTime, outputPath, options)` - Main clip cutter
- `processClipsFromMetadata(videoPath, clips, projectId, options)` - Batch processing
- `extractPreviewSegment(videoPath, startTime, endTime, clipId)` - Preview generation
- `generateClipTitle(audioPath, fallbackTitle)` - Title generation

**Output Formats**:
- **9:16 Vertical**: TikTok, Instagram Reels, YouTube Shorts
- **2.35:1 Cinematic**: Motivational templates with overlays
- **1-minute Preview**: Template demonstration videos

---

## 🔄 Complete Processing Pipeline

### Input: Long-form Video URL
```
https://youtube.com/watch?v=example123
```

### Stage 1: Video Acquisition
```
videoDownloadService.js
├── Download video using yt-dlp
├── Extract metadata (title, duration, platform)
├── Store in temporary directory
└── Return: { filePath, metadata, platform }
```

### Stage 2: Audio Processing
```
audioChunkingService.js
├── Check file size (>25MB?)
├── Extract audio (MP3, 128k, 22050Hz)
├── Split into 10-minute chunks if needed
└── Return: { chunks: [], needsChunking: boolean }
```

### Stage 3: Transcription
```
openaiWhisperService.js
├── Process each chunk with Whisper API
├── Adjust timestamps for chunk offsets
├── Combine all transcriptions
├── Generate word-level timestamps
└── Return: { text, segments, words, duration }
```

### Stage 4: AI Analysis
```
deepseekAnalysisService.js
├── Analyze transcript for viral moments
├── Score each potential clip (0-100)
├── Generate SEO titles + social hooks
├── Ensure 15-60 second durations
└── Return: { clips: [{ startTime, endTime, title, score }] }
```

### Stage 5: Clip Generation
```
clipCuttingService.js
├── For each viral moment:
│   ├── Cut 9:16 vertical version
│   ├── Cut 2.35:1 cinematic version
│   ├── Add captions with word timing
│   ├── Generate 1-minute preview
│   └── Upload to Firebase storage
└── Return: { processedClips: [{ vertical, horizontal, preview }] }
```

### Final Output: Ready-to-Post Viral Clips
```json
{
  "clips": [
    {
      "title": "This CEO's Response Will Shock You",
      "templateHeader": "You won't believe what he said next 😱",
      "viralityScore": 95,
      "duration": 28.5,
      "vertical": "https://firebase.../9x16_clip.mp4",
      "horizontal": "https://firebase.../cinematic_clip.mp4",
      "preview": "https://firebase.../preview.mp4"
    }
  ]
}
```

---

## 🛠️ Technical Requirements

### Dependencies
- **yt-dlp**: Video downloading from multiple platforms
- **FFmpeg**: Video/audio processing and transcoding
- **OpenAI Whisper**: Speech-to-text transcription
- **DeepSeek API**: AI-powered content analysis
- **Firebase**: Cloud storage for generated clips

### Environment Variables
```bash
OPENAI_API_KEY=sk-...          # OpenAI API key for Whisper
DEEPSEEK_API_KEY=sk-...        # DeepSeek API key for analysis
FIREBASE_PROJECT_ID=...        # Firebase project configuration
FIREBASE_PRIVATE_KEY=...       # Firebase service account
FIREBASE_CLIENT_EMAIL=...      # Firebase service account email
```

### File Size Limits & Optimization
- **Whisper API**: 25MB max per file (handled by chunking)
- **DeepSeek API**: 128K tokens max (handled by MapReduce)
- **Output Video**: Optimized for social media platforms
- **Storage**: Automatic cleanup of temporary files

---

## 📊 Cost & Performance

### API Costs (per video)
- **Whisper**: ~$0.006 per minute of audio
- **DeepSeek**: ~$0.27 per 1M input tokens, $1.10 per 1M output tokens
- **Firebase**: Storage and bandwidth costs

### Processing Times
- **Download**: 1-5 minutes (depends on video length/quality)
- **Transcription**: ~1 minute per hour of content
- **AI Analysis**: 30-60 seconds per transcript
- **Clip Generation**: 10-30 seconds per clip

### Quality Metrics
- **Virality Score**: 50-100 scale (only clips ≥50 are processed)
- **Accuracy**: Word-level timestamps with ±0.1s precision  
- **Output Quality**: 720p+ with platform-specific optimization

---

## 🚀 Usage Example

```javascript
// Complete workflow example
const videoUrl = "https://youtube.com/watch?v=example";

// 1. Download video
const downloadResult = await downloadVideoWithMetadata(videoUrl);

// 2. Transcribe with chunking
const transcription = await transcribeWithWhisper(downloadResult.filePath);

// 3. Analyze for viral moments  
const analysis = await analyzeContentWithDeepSeek(transcription, {
  maxClips: 10,
  videoTitle: downloadResult.metadata.title
});

// 4. Generate clips
const processedClips = await processClipsFromMetadata(
  downloadResult.filePath, 
  analysis.clips,
  "project_id",
  downloadResult.metadata.title,
  transcription
);

// Result: Array of viral clips ready for social media
```

This system transforms hours of content into viral-ready clips in minutes, using cutting-edge AI to identify the most engaging moments and optimize them for maximum social media impact.