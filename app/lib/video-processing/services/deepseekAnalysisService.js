/**
 * DeepSeek Content Analysis Service
 * Uses DeepSeek-Chat (V3) to analyze video transcriptions and identify viral moments
 * for intelligent clip creation with dynamic durations (15-60s)
 */

/**
 * Analyze transcription with DeepSeek to find the best viral moments
 * @param {Object} transcription - Whisper transcription result
 * @param {Object} options - Analysis options
 * @returns {Promise<Array>} - Array of intelligent clip suggestions
 */
export async function analyzeContentWithDeepSeek(transcription, options = {}) {
  const {
    minClipDuration = 15,  // Minimum clip length in seconds
    maxClipDuration = 60,  // Maximum clip length in seconds
    maxClips = 10,         // Maximum clips to generate (let AI decide quality)
    videoTitle = 'Video',  // Original video title for context
    videoType = 'general'  // Type hint: gaming, tutorial, reaction, etc.
  } = options;

  try {
    console.log(`🧠 [DEEPSEEK] Starting content analysis for: ${videoTitle}`);
    console.log(`⚙️ [DEEPSEEK] Duration range: ${minClipDuration}s - ${maxClipDuration}s`);

    // Prepare transcription data for DeepSeek
    const segmentsText = transcription.segments
      .map(segment => `[${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s]: ${segment.text}`)
      .join('\n');

    // Create intelligent analysis prompt
    const analysisPrompt = `You are an expert content curator for viral short-form videos. Analyze this video transcription and identify the BEST moments for engaging clips.

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Type: ${videoType}
- Total Duration: ${transcription.duration?.toFixed(1) || 'unknown'} seconds
- Language: ${transcription.language || 'auto-detected'}

TRANSCRIPTION WITH TIMESTAMPS:
${segmentsText}

TASK: Find the most engaging moments that would make viral short-form content. Look for:

🔥 HIGH-ENERGY MOMENTS:
- Excitement, surprise, shock reactions
- "WOW", "OMG", "NO WAY" type reactions
- Laughter, screaming, intense emotions

💡 ENGAGING CONTENT:
- Interesting questions or revelations
- Plot twists or unexpected moments
- Educational "aha!" moments
- Funny or clever statements

🎯 VIRAL INDICATORS:
- Relatable situations
- Quotable lines
- Visual or action peaks (implied by speech)
- Cliffhangers or story climax

REQUIREMENTS:
- Each clip must be ${minClipDuration}-${maxClipDuration} seconds long
- Find natural start/end points (complete thoughts/sentences)
- Prioritize quality over quantity (better to have 3 amazing clips than 10 mediocre ones)
- Consider setup + payoff (don't cut off context)
- Create engaging, specific titles (not generic)

Return ONLY a JSON array with this exact format:
[
  {
    "startTime": 45.2,
    "endTime": 67.8,
    "duration": 22.6,
    "title": "Specific engaging title based on content",
    "reason": "Why this moment is engaging",
    "viralityScore": 85,
    "engagementType": "reaction|educational|funny|dramatic|relatable",
    "hasSetup": true,
    "hasPayoff": true,
    "contentTags": ["emotion", "surprise", "quotable"]
  }
]

IMPORTANT: 
- Only include clips with viralityScore ≥ 60
- Maximum ${maxClips} clips total
- Ensure timestamps are within the transcription range
- Make titles specific and compelling (not "Amazing moment" but "When he realizes the truth about...")`;

    // Call DeepSeek API
    console.log(`🚀 [DEEPSEEK] Sending prompt to DeepSeek API...`);
    console.log(`📄 [DEEPSEEK] Prompt length: ${analysisPrompt.length} characters`);
    
    const startTime = Date.now();
    const deepseekResponse = await callDeepSeekAPI(analysisPrompt);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`⚡ [DEEPSEEK] Analysis completed in ${processingTime}s`);
    console.log(`📋 [DEEPSEEK] Raw response length: ${deepseekResponse.content?.length || 0} characters`);
    console.log(`🔍 [DEEPSEEK] Response preview:`, deepseekResponse.content?.substring(0, 200) + '...');

    // Parse and validate response
    let intelligentClips;
    try {
      console.log(`🔧 [DEEPSEEK] Attempting to parse JSON response...`);
      intelligentClips = JSON.parse(deepseekResponse.content);
      console.log(`✅ [DEEPSEEK] Successfully parsed ${intelligentClips.length} clips from response`);
    } catch (parseError) {
      console.error('❌ [DEEPSEEK] Failed to parse JSON response:', parseError.message);
      console.log(`🔍 [DEEPSEEK] Full response for debugging:`, deepseekResponse.content);
      
      // Fallback to extract JSON from response
      console.log(`🔄 [DEEPSEEK] Attempting to extract JSON array from response...`);
      const jsonMatch = deepseekResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        console.log(`🎯 [DEEPSEEK] Found JSON match, attempting to parse...`);
        intelligentClips = JSON.parse(jsonMatch[0]);
        console.log(`✅ [DEEPSEEK] Fallback parsing successful: ${intelligentClips.length} clips`);
      } else {
        console.error('❌ [DEEPSEEK] No JSON array found in response');
        throw new Error('DeepSeek response is not valid JSON');
      }
    }

    // Validate and clean clips
    console.log(`🔍 [DEEPSEEK] Validating ${intelligentClips.length} clips...`);
    const validClips = intelligentClips
      .filter(clip => {
        // Validate required fields
        if (!clip.startTime || !clip.endTime || !clip.title) {
          console.warn(`❌ [DEEPSEEK] Skipping invalid clip: missing required fields`, {
            startTime: clip.startTime,
            endTime: clip.endTime,
            title: clip.title
          });
          return false;
        }

        // Validate duration
        const duration = clip.endTime - clip.startTime;
        if (duration < minClipDuration || duration > maxClipDuration) {
          console.warn(`❌ [DEEPSEEK] Skipping clip "${clip.title}": duration ${duration}s outside range ${minClipDuration}s-${maxClipDuration}s`);
          return false;
        }

        // Validate timestamps are within transcription
        if (clip.startTime < 0 || clip.endTime > transcription.duration) {
          console.warn(`❌ [DEEPSEEK] Skipping clip "${clip.title}": timestamps outside video range 0-${transcription.duration}s`, {
            clipStart: clip.startTime,
            clipEnd: clip.endTime
          });
          return false;
        }

        // Validate virality score
        if (clip.viralityScore < 60) {
          console.warn(`❌ [DEEPSEEK] Skipping clip "${clip.title}": virality score too low (${clip.viralityScore}/100)`);
          return false;
        }

        console.log(`✅ [DEEPSEEK] Valid clip: "${clip.title}" (${duration}s, score: ${clip.viralityScore}/100)`);
        return true;
      })
      .map(clip => ({
        ...clip,
        duration: parseFloat((clip.endTime - clip.startTime).toFixed(1)),
        startTime: parseFloat(clip.startTime.toFixed(1)),
        endTime: parseFloat(clip.endTime.toFixed(1)),
        viralityScore: Math.min(100, Math.max(0, clip.viralityScore)),
        processingTime: parseFloat(processingTime),
        analyzedAt: new Date().toISOString(),
        source: 'deepseek-v3'
      }))
      .sort((a, b) => b.viralityScore - a.viralityScore); // Sort by virality score

    console.log(`🎯 [DEEPSEEK] Found ${validClips.length}/${intelligentClips.length} high-quality clips`);
    
    if (validClips.length > 0) {
      console.log(`📊 [DEEPSEEK] Top clip: "${validClips[0].title}" (${validClips[0].viralityScore}/100)`);
      console.log(`⏱️ [DEEPSEEK] Duration range: ${Math.min(...validClips.map(c => c.duration))}s - ${Math.max(...validClips.map(c => c.duration))}s`);
      
      // Log all clips for debugging
      console.log(`📋 [DEEPSEEK] All clips summary:`);
      validClips.forEach((clip, index) => {
        console.log(`  ${index + 1}. "${clip.title}" (${clip.startTime}s-${clip.endTime}s, ${clip.duration}s, score: ${clip.viralityScore})`);
      });
    } else {
      console.warn(`⚠️ [DEEPSEEK] No valid clips found! Check transcription quality and analysis parameters.`);
    }

    return {
      success: true,
      clips: validClips,
      totalClips: validClips.length,
      processingTime: parseFloat(processingTime),
      cost: calculateDeepSeekCost(analysisPrompt, deepseekResponse.content),
      metadata: {
        model: 'deepseek-chat-v3',
        promptTokens: estimateTokens(analysisPrompt),
        responseTokens: estimateTokens(deepseekResponse.content),
        cacheHit: false // TODO: Implement cache detection
      }
    };

  } catch (error) {
    console.error('❌ [DEEPSEEK] Content analysis failed:', error);
    throw new Error(`DeepSeek analysis failed: ${error.message}`);
  }
}

/**
 * Call DeepSeek API
 * @param {string} prompt - Analysis prompt
 * @returns {Promise<Object>} - DeepSeek response
 */
async function callDeepSeekAPI(prompt) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content curator specializing in viral short-form video content. You understand what makes content engaging and shareable across platforms like TikTok, Instagram Reels, and YouTube Shorts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7, // Slightly creative for engaging titles
      stream: false
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('DeepSeek API key invalid or missing. Check your DEEPSEEK_API_KEY environment variable.');
    } else if (response.status === 429) {
      throw new Error('DeepSeek rate limit exceeded. Please wait and try again.');
    } else if (response.status === 400) {
      throw new Error(`DeepSeek API error: ${errorData.error?.message || 'Invalid request'}`);
    }
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from DeepSeek API');
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: data.model
  };
}

/**
 * Calculate estimated cost for DeepSeek API call
 * @param {string} prompt - Input prompt
 * @param {string} response - API response
 * @returns {number} - Estimated cost in USD
 */
function calculateDeepSeekCost(prompt, response) {
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(response);
  
  // DeepSeek-Chat pricing (assuming cache miss)
  const inputCost = (inputTokens / 1000000) * 0.27;  // $0.27 per 1M tokens
  const outputCost = (outputTokens / 1000000) * 1.10; // $1.10 per 1M tokens
  
  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Estimate token count (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

export default {
  analyzeContentWithDeepSeek,
  calculateDeepSeekCost,
  estimateTokens
};