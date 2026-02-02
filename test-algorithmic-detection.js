/**
 * Test Algorithmic Clip Detection
 * This tests the algorithmic analysis without requiring video downloads
 */

// Simulate the algorithmic functions from visionClipService.js
const fs = require('fs');

// Simulate the algorithmic analysis functions
const calculateOptimalMoments = (duration, platform) => {
  const moments = [];
  
  console.log(`🎯 [OPTIMAL] Calculating optimal moments for ${platform}...`);
  
  // Golden ratio points (most engaging moments)
  const goldenRatio = 0.618;
  moments.push({
    time: duration * 0.15, // Hook/intro end
    type: 'hook_end',
    score: 85,
    reason: 'End of hook/intro'
  });
  
  moments.push({
    time: duration * goldenRatio, // Primary golden ratio
    type: 'golden_primary',
    score: 95,
    reason: 'Primary golden ratio point'
  });
  
  moments.push({
    time: duration * (1 - goldenRatio), // Secondary golden ratio
    type: 'golden_secondary', 
    score: 90,
    reason: 'Secondary golden ratio point'
  });
  
  // Platform-specific moments
  if (platform === 'tiktok' || platform === 'instagram') {
    moments.push({
      time: duration * 0.05, // Very early hook for short-form
      type: 'short_form_hook',
      score: 88,
      reason: 'Short-form platform early hook'
    });
  }
  
  if (duration > 60) { // Longer videos
    moments.push({
      time: duration * 0.85, // Climax/conclusion
      type: 'climax',
      score: 82,
      reason: 'Video climax/conclusion'
    });
  }
  
  console.log(`🎯 [OPTIMAL] Found ${moments.length} optimal moments`);
  return moments;
};

const calculateAlgorithmicScore = (params) => {
  const { timestamp, duration, frameIndex, totalFrames, title, platform, optimalMoments } = params;
  
  let score = 30; // Base score
  
  // Check proximity to optimal moments
  for (const moment of optimalMoments) {
    const distance = Math.abs(timestamp - moment.time);
    const proximity = Math.max(0, 1 - (distance / (duration * 0.1))); // Within 10% of duration
    
    if (proximity > 0.7) {
      score += moment.score * proximity;
      console.log(`🎯 [SCORE] Near ${moment.type}: +${(moment.score * proximity).toFixed(0)}`);
    }
  }
  
  // Title-based scoring
  if (title) {
    const titleLower = title.toLowerCase();
    const highEngagementWords = [
      'amazing', 'incredible', 'shocking', 'unbelievable', 'epic',
      'insane', 'crazy', 'mind-blowing', 'viral', 'trending'
    ];
    
    const actionWords = [
      'watch', 'see', 'look', 'check', 'must', 'need', 'how', 'why', 'what'
    ];
    
    highEngagementWords.forEach(word => {
      if (titleLower.includes(word)) {
        score += 15;
        console.log(`📝 [SCORE] High engagement word "${word}": +15`);
      }
    });
    
    actionWords.forEach(word => {
      if (titleLower.includes(word)) {
        score += 8;
        console.log(`📝 [SCORE] Action word "${word}": +8`);
      }
    });
  }
  
  // Platform-specific adjustments
  if (platform === 'tiktok' || platform === 'instagram') {
    // Favor early moments for short-form content
    if (timestamp < duration * 0.3) {
      score += 20;
      console.log(`📱 [SCORE] Short-form early moment: +20`);
    }
  }
  
  // Duration-based scoring
  if (duration > 0) {
    const relativePosition = timestamp / duration;
    
    // Slight preference for middle sections
    if (relativePosition > 0.2 && relativePosition < 0.8) {
      score += 10;
      console.log(`⏱️ [SCORE] Middle section preference: +10`);
    }
  }
  
  // Clamp score between 0-100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log(`📊 [SCORE] Final score: ${finalScore}`);
  
  return finalScore;
};

const generateTimeBasedDescription = (timestamp, duration, platform) => {
  const relativePosition = duration > 0 ? timestamp / duration : 0;
  
  let description = '';
  
  if (relativePosition < 0.15) {
    description = 'Opening sequence with potential hook content';
  } else if (relativePosition < 0.4) {
    description = 'Early content development with building engagement';
  } else if (relativePosition < 0.65) {
    description = 'Core content section with peak engagement potential';
  } else if (relativePosition < 0.85) {
    description = 'Advanced content with climax development';
  } else {
    description = 'Conclusion section with resolution and call-to-action';
  }
  
  // Add platform-specific context
  if (platform === 'tiktok') {
    description += ' (optimized for TikTok engagement patterns)';
  } else if (platform === 'instagram') {
    description += ' (optimized for Instagram Reels engagement)';
  } else if (platform === 'youtube') {
    description += ' (optimized for YouTube engagement and retention)';
  }
  
  return description;
};

// Test function
async function testAlgorithmicDetection() {
  console.log('🚀 Testing Algorithmic Clip Detection System');
  console.log('============================================\n');
  
  // Test case 1: YouTube video
  const youtubeTest = {
    title: 'How to Make Incredible Content in 2024',
    duration: 180, // 3 minutes
    platform: 'youtube',
    numFrames: 8
  };
  
  console.log('📹 Test 1: YouTube Video Analysis');
  console.log(`Title: "${youtubeTest.title}"`);
  console.log(`Duration: ${youtubeTest.duration}s`);
  console.log(`Platform: ${youtubeTest.platform}\n`);
  
  // Calculate optimal moments
  const optimalMoments = calculateOptimalMoments(youtubeTest.duration, youtubeTest.platform);
  
  // Simulate frame analysis
  const frameAnalysis = [];
  for (let i = 0; i < youtubeTest.numFrames; i++) {
    const timestamp = (i / youtubeTest.numFrames) * youtubeTest.duration;
    
    const engagementScore = calculateAlgorithmicScore({
      timestamp,
      duration: youtubeTest.duration,
      frameIndex: i,
      totalFrames: youtubeTest.numFrames,
      title: youtubeTest.title,
      platform: youtubeTest.platform,
      optimalMoments
    });
    
    const analysis = generateTimeBasedDescription(timestamp, youtubeTest.duration, youtubeTest.platform);
    
    frameAnalysis.push({
      frameIndex: i,
      timestamp,
      analysis,
      engagementScore
    });
    
    console.log(`✅ Frame ${i + 1}: ${timestamp.toFixed(1)}s - Score: ${engagementScore} - "${analysis}"\n`);
  }
  
  // Identify top clips
  const highEngagementFrames = frameAnalysis
    .filter(frame => frame.engagementScore >= 25)
    .sort((a, b) => b.engagementScore - a.engagementScore);
  
  console.log('🎬 Top Clip Candidates:');
  console.log('========================');
  
  const clips = [];
  for (let i = 0; i < Math.min(3, highEngagementFrames.length); i++) {
    const frame = highEngagementFrames[i];
    const startTime = Math.max(0, frame.timestamp - 15);
    const endTime = frame.timestamp + 15;
    
    const clip = {
      id: `clip_${i + 1}`,
      startTime,
      endTime,
      duration: 30,
      engagementScore: frame.engagementScore,
      description: frame.analysis,
      reason: 'High engagement detected by algorithmic analysis'
    };
    
    clips.push(clip);
    
    console.log(`Clip ${i + 1}:`);
    console.log(`  ⏰ Time: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`);
    console.log(`  📊 Score: ${frame.engagementScore}/100`);
    console.log(`  📝 Description: "${frame.analysis}"`);
    console.log('');
  }
  
  console.log('🎉 Test Complete!');
  console.log(`✅ Successfully identified ${clips.length} potential clips`);
  console.log(`📈 Average engagement: ${(frameAnalysis.reduce((sum, f) => sum + f.engagementScore, 0) / frameAnalysis.length).toFixed(1)}/100`);
  
  return {
    success: true,
    clips,
    totalFramesAnalyzed: frameAnalysis.length,
    averageEngagementScore: frameAnalysis.reduce((sum, f) => sum + f.engagementScore, 0) / frameAnalysis.length
  };
}

// Run the test
testAlgorithmicDetection()
  .then(result => {
    console.log('\n🏆 Final Results:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });