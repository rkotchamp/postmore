# Clipper Studio Setup Guide

This guide covers the setup requirements for Task ID 3: Video Processing Tools Setup.

## ✅ Completed Installation

The following packages have been successfully installed:

- `fluent-ffmpeg` - FFmpeg wrapper for video processing
- `yt-dlp-wrap` - YouTube-dl wrapper for video downloads  
- `subtitle` - Subtitle generation and parsing

## 🔧 Required System Dependencies

### 1. FFmpeg Installation

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 2. yt-dlp Installation

**macOS (using Homebrew):**
```bash
brew install yt-dlp
```

**Using pip:**
```bash
pip install yt-dlp
```

**Or download binary from:** https://github.com/yt-dlp/yt-dlp/releases

### 3. OpenCV4nodejs (Optional - for Face Detection)

**Prerequisites:**
- cmake
- Python 3.x
- Build tools (Xcode Command Line Tools on macOS)

**macOS Setup:**
```bash
# Install cmake
brew install cmake

# Then install opencv4nodejs
npm install opencv4nodejs
```

**If you encounter issues, you can disable OpenCV:**
```bash
export OPENCV4NODEJS_DISABLE_AUTOBUILD=1
```

## 🔐 Environment Variables Setup

Add these variables to your `.env.local` file:

```env
# REQUIRED - Your Hugging Face Whisper API Configuration
HUGGINGFACE_WHISPER_API_URL=https://your-whisper-endpoint.hf.space/transcribe
HUGGINGFACE_API_TOKEN=hf_your_token_here

# OPTIONAL - Custom binary paths (if not in system PATH)
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
YTDLP_PATH=/usr/local/bin/yt-dlp

# OPTIONAL - Custom directories
VIDEO_DOWNLOAD_DIR=./temp/downloads
VIDEO_PROCESSING_TEMP_DIR=./temp/processing
```

## 🤗 Hugging Face Whisper API Setup

### What You Need to Provide:

1. **API Endpoint URL**: Your hosted Whisper model endpoint
   - Format: `https://your-username-whisper-model.hf.space/transcribe`
   - Or your custom deployment URL

2. **API Token** (if required):
   - Hugging Face API token for authentication
   - Get from: https://huggingface.co/settings/tokens

3. **API Request/Response Format**:
   Please provide details about:
   - Expected request format (JSON, FormData, etc.)
   - Request parameters your model accepts
   - Response structure from your model

### Example API Integration:

The service expects this format (adjust based on your actual API):

**Request:**
```javascript
POST https://your-whisper-endpoint.hf.space/transcribe
Content-Type: application/json
Authorization: Bearer hf_your_token

{
  "inputs": "base64_audio_data_or_file_buffer",
  "parameters": {
    "return_timestamps": true,
    "language": "auto"
  }
}
```

**Expected Response:**
```javascript
{
  "text": "Transcribed text here",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "First segment"
    }
  ],
  "language": "en"
}
```

## 📁 Created File Structure

```
app/lib/video-processing/
├── services/
│   ├── huggingfaceWhisperService.js ✅
│   ├── ffmpegService.js ✅
│   ├── downloaderService.js ✅
│   ├── subtitleService.js ✅
│   └── faceDetectionService.js ✅
├── utils/
│   ├── videoUtils.js ✅
│   └── configValidator.js ✅
└── config/
    └── videoProcessingConfig.js ✅

app/api/video-processing/
├── transcribe/route.js ✅
├── download/route.js ✅
├── process/route.js ✅
└── detect-faces/route.js ✅
```

## 🧪 Testing the Setup

### 1. Configuration Validation

Create a test script to validate your setup:

```javascript
// test-setup.js
const ConfigValidator = require('./app/lib/video-processing/utils/configValidator');

async function testSetup() {
  const config = await ConfigValidator.validateAllConfigs();
  console.log(await ConfigValidator.generateReport());
}

testSetup();
```

### 2. API Endpoints Testing

Once your environment is configured, test these endpoints:

- `GET /api/video-processing/transcribe` - Health check
- `GET /api/video-processing/download` - Health check  
- `GET /api/video-processing/process` - Health check
- `GET /api/video-processing/detect-faces` - Health check

### 3. Service Health Check

```bash
curl http://localhost:3000/api/video-processing/transcribe
```

## ⚡ Quick Start

1. **Install system dependencies** (FFmpeg, yt-dlp)
2. **Set up environment variables** in `.env.local`
3. **Provide Hugging Face API details**
4. **Test the configuration** using the validation script
5. **Start using the API endpoints**

## 🚨 Common Issues

### FFmpeg Not Found
- Ensure FFmpeg is installed and in your PATH
- Set `FFMPEG_PATH` environment variable if needed

### yt-dlp Not Working
- Update yt-dlp to latest version: `pip install -U yt-dlp`
- Some platforms may require specific extractors

### OpenCV Issues
- Face detection is optional - system works without it
- Set `OPENCV4NODEJS_DISABLE_AUTOBUILD=1` if having build issues

### Hugging Face API Issues
- Verify your API endpoint URL is correct
- Check if API token is required for your deployment
- Ensure your model accepts the request format we're sending

## 📝 Next Steps

Once this setup is complete, we can proceed to:
- Task ID 4: Video Transcription and Clip Detection
- Task ID 5: Video Editing and Cropping Tools
- Integration with the Clipper Studio UI

## 🤝 Support Needed

Please provide:
1. Your Hugging Face Whisper API endpoint URL
2. Authentication requirements (API token if needed)
3. Expected request/response format for your model
4. Any specific parameters your model supports

This information will allow me to properly configure the `huggingfaceWhisperService.js` for your specific deployment.