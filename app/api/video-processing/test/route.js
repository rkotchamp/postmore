import { NextResponse } from 'next/server';
import { HuggingFaceWhisperService } from '../../../lib/video-processing/services/huggingfaceWhisperService';
import { detectClips, getHealthStatus } from '../../../lib/video-processing/services/clipDetectionService';
import { secondsToFFmpegTime, validateTimestampRange, generateTimelineData } from '../../../lib/video-processing/utils/timestampParser';

export async function POST(request) {
  console.log('🚀 [TEST] Starting video processing test...');
  
  try {
    const body = await request.json();
    const { testType = 'health-check', mockData } = body;
    
    console.log(`🔍 [TEST] Test type: ${testType}`);
    
    // Test 1: Health Check
    if (testType === 'health-check') {
      console.log('🏥 [TEST] Running health checks...');
      
      const whisperService = new HuggingFaceWhisperService();
      const whisperHealth = await whisperService.getHealthStatus();
      console.log('📊 [WHISPER] Health status:', whisperHealth);
      
      const clipDetectionHealth = await getHealthStatus();
      console.log('📊 [CLIP-DETECTION] Health status:', clipDetectionHealth);
      
      return NextResponse.json({
        success: true,
        testType: 'health-check',
        results: {
          whisper: whisperHealth,
          clipDetection: clipDetectionHealth,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Test 2: Mock Transcription Processing
    if (testType === 'mock-transcription') {
      console.log('🎙️ [TEST] Testing with mock transcription data...');
      
      const mockTranscription = mockData || {
        segments: [
          { start: 0, end: 5.2, text: "Hey everyone, welcome back to my channel!", confidence: 0.95 },
          { start: 5.2, end: 10.5, text: "Today I'm going to show you something amazing that will blow your mind.", confidence: 0.92 },
          { start: 10.5, end: 15.8, text: "This technique has changed my life completely.", confidence: 0.88 },
          { start: 15.8, end: 22.1, text: "First, you need to understand the basic principles.", confidence: 0.91 },
          { start: 22.1, end: 28.5, text: "The secret is in the details that most people miss.", confidence: 0.89 },
          { start: 28.5, end: 35.2, text: "Are you ready to learn this incredible trick?", confidence: 0.93 },
          { start: 35.2, end: 42.0, text: "Let me break it down step by step for you.", confidence: 0.90 },
          { start: 42.0, end: 48.5, text: "This is the most important part - pay attention!", confidence: 0.94 },
          { start: 48.5, end: 55.0, text: "If you found this helpful, make sure to subscribe!", confidence: 0.87 }
        ]
      };
      
      console.log('📝 [TRANSCRIPTION] Mock data segments:', mockTranscription.segments.length);
      
      // Test clip detection
      console.log('🎬 [CLIP-DETECTION] Analyzing segments for clips...');
      const clips = await detectClips(mockTranscription, {
        platform: 'tiktok',
        contentType: 'educational',
        targetClipCount: 3,
        minEngagementScore: 0.5
      });
      
      console.log(`✨ [CLIP-DETECTION] Found ${clips.length} potential clips`);
      clips.forEach((clip, index) => {
        console.log(`📹 [CLIP ${index + 1}] Score: ${clip.engagementScore.toFixed(2)}, Duration: ${clip.duration.toFixed(1)}s`);
        console.log(`   Text: "${clip.text.substring(0, 80)}..."`);
        console.log(`   Factors: ${clip.engagementFactors.join(', ')}`);
      });
      
      // Test timestamp utilities
      console.log('⏱️ [TIMESTAMP] Testing timestamp utilities...');
      const firstClip = clips[0];
      if (firstClip) {
        const ffmpegStart = secondsToFFmpegTime(firstClip.startTime);
        const ffmpegEnd = secondsToFFmpegTime(firstClip.endTime);
        console.log(`🕐 [TIMESTAMP] Clip 1: ${ffmpegStart} - ${ffmpegEnd}`);
        
        const validation = validateTimestampRange(firstClip.startTime, firstClip.endTime, 60);
        console.log('✅ [VALIDATION] Timestamp validation:', validation);
      }
      
      // Generate timeline data
      if (clips.length > 0) {
        const timeline = generateTimelineData(clips, 55);
        console.log('📊 [TIMELINE] Timeline data:', timeline);
      }
      
      return NextResponse.json({
        success: true,
        testType: 'mock-transcription',
        results: {
          transcriptionSegments: mockTranscription.segments.length,
          detectedClips: clips.length,
          clips: clips.map(clip => ({
            id: clip.id,
            rank: clip.rank,
            duration: clip.duration,
            engagementScore: clip.engagementScore,
            engagementFactors: clip.engagementFactors,
            text: clip.text.substring(0, 100) + '...',
            timeRange: `${clip.startTime.toFixed(1)}s - ${clip.endTime.toFixed(1)}s`
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Test 3: Whisper Service Connection
    if (testType === 'whisper-connection') {
      console.log('🔌 [TEST] Testing Hugging Face Whisper connection...');
      
      const whisperService = new HuggingFaceWhisperService();
      
      try {
        console.log('🚀 [WHISPER] Initializing client...');
        await whisperService.initializeClient();
        console.log('✅ [WHISPER] Client initialized successfully');
        
        const health = await whisperService.getHealthStatus();
        console.log('📊 [WHISPER] Health check result:', health);
        
        return NextResponse.json({
          success: true,
          testType: 'whisper-connection',
          results: {
            connectionStatus: 'connected',
            health,
            spaceName: process.env.HUGGINGFACE_SPACE_NAME,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error('❌ [WHISPER] Connection failed:', error.message);
        
        return NextResponse.json({
          success: false,
          testType: 'whisper-connection',
          error: error.message,
          results: {
            connectionStatus: 'failed',
            spaceName: process.env.HUGGINGFACE_SPACE_NAME,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    // Test 4: Full Pipeline Test
    if (testType === 'full-pipeline') {
      console.log('🔄 [TEST] Running full pipeline test...');
      
      // Step 1: Check all services
      console.log('1️⃣ [PIPELINE] Checking service health...');
      const whisperService = new HuggingFaceWhisperService();
      const whisperHealth = await whisperService.getHealthStatus();
      const clipHealth = await getHealthStatus();
      
      console.log('📊 [PIPELINE] Service health:', { whisper: whisperHealth.status, clips: clipHealth.status });
      
      // Step 2: Mock audio processing (since we don't have real audio)
      console.log('2️⃣ [PIPELINE] Simulating audio transcription...');
      const mockTranscription = {
        segments: [
          { start: 0, end: 8.5, text: "What's up guys! Today's video is going to be absolutely insane!", confidence: 0.95 },
          { start: 8.5, end: 15.2, text: "I'm going to teach you the number one secret that changed everything.", confidence: 0.92 },
          { start: 15.2, end: 23.8, text: "Are you ready for this? Because what I'm about to show you is mind-blowing.", confidence: 0.88 },
          { start: 23.8, end: 32.1, text: "Step one: You need to completely forget everything you thought you knew.", confidence: 0.91 },
          { start: 32.1, end: 40.5, text: "This technique is so powerful, it should probably be illegal!", confidence: 0.89 },
          { start: 40.5, end: 48.0, text: "But wait, there's more! The second part will shock you even more.", confidence: 0.93 },
          { start: 48.0, end: 55.5, text: "If you're not subscribed yet, what are you even doing with your life?", confidence: 0.90 }
        ]
      };
      
      // Step 3: Clip detection
      console.log('3️⃣ [PIPELINE] Detecting optimal clips...');
      const detectedClips = await detectClips(mockTranscription, {
        platform: 'tiktok',
        contentType: 'entertainment',
        targetClipCount: 5,
        minEngagementScore: 0.4
      });
      
      // Step 4: Timestamp processing
      console.log('4️⃣ [PIPELINE] Processing timestamps...');
      const processedClips = detectedClips.map(clip => {
        const validation = validateTimestampRange(clip.startTime, clip.endTime, 60);
        return {
          ...clip,
          ffmpegStart: secondsToFFmpegTime(clip.startTime),
          ffmpegEnd: secondsToFFmpegTime(clip.endTime),
          validation
        };
      });
      
      console.log(`✅ [PIPELINE] Pipeline complete! Generated ${processedClips.length} clips`);
      
      return NextResponse.json({
        success: true,
        testType: 'full-pipeline',
        results: {
          servicesHealthy: whisperHealth.status === 'healthy' && clipHealth.status === 'healthy',
          transcriptionSegments: mockTranscription.segments.length,
          detectedClips: detectedClips.length,
          validClips: processedClips.filter(c => c.validation.isValid).length,
          topClips: processedClips.slice(0, 3).map(clip => ({
            id: clip.id,
            score: clip.engagementScore,
            duration: clip.duration,
            timeRange: `${clip.ffmpegStart} - ${clip.ffmpegEnd}`,
            factors: clip.engagementFactors,
            preview: clip.text.substring(0, 60) + '...'
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown test type',
      availableTests: ['health-check', 'mock-transcription', 'whisper-connection', 'full-pipeline']
    });
    
  } catch (error) {
    console.error('💥 [TEST] Test failed:', error);
    console.error('📍 [ERROR] Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  console.log('📋 [TEST] Test endpoint info requested');
  
  return NextResponse.json({
    message: 'Video Processing Test Endpoint',
    availableTests: [
      {
        type: 'health-check',
        description: 'Check health status of all video processing services',
        method: 'POST',
        body: { testType: 'health-check' }
      },
      {
        type: 'mock-transcription',
        description: 'Test clip detection with mock transcription data',
        method: 'POST',
        body: { testType: 'mock-transcription' }
      },
      {
        type: 'whisper-connection',
        description: 'Test Hugging Face Whisper service connection',
        method: 'POST',
        body: { testType: 'whisper-connection' }
      },
      {
        type: 'full-pipeline',
        description: 'Run complete video processing pipeline test',
        method: 'POST',
        body: { testType: 'full-pipeline' }
      }
    ],
    environment: {
      hasWhisperSpace: !!process.env.HUGGINGFACE_SPACE_NAME,
      hasWhisperToken: !!process.env.HUGGINGFACE_API_TOKEN,
      spaceName: process.env.HUGGINGFACE_SPACE_NAME || 'not configured'
    }
  });
}