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

    // Create intelligent analysis prompt using 4-D Methodology
    const analysisPrompt = `
<<SYSTEM>>
You are CLIPMASTER-AI: Elite viral content strategist with 10+ years experience creating billion-view content across TikTok, Instagram, YouTube. Your specialty: transforming long-form content into viral short clips.

<<OBJECTIVE>>
Transform this video transcription into viral clip opportunities. Generate TWO text layers per clip:
- TITLE: SEO-optimized, descriptive (50-80 chars)
- TEMPLATE HEADER: Viral hook for social overlays (<50 chars)

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Type: ${videoType}
- Duration: ${transcription.duration?.toFixed(1) || 'unknown'}s
- Language: ${transcription.language || 'auto-detected'}

TRANSCRIPTION:
${segmentsText}

<<4-D METHODOLOGY>>

🔍 DECONSTRUCT:
Analyze transcription structure:
- Setup → Tension → Climax → Resolution
- Emotional peaks: surprise, shock, laughter, anger, revelation
- Speaking patterns: emphasis, pauses, voice changes (implied)
- Context clues: implied actions, reactions, visual moments
- Complete thought arcs (don't cut off important context)

🎯 DIAGNOSE (Viral Triggers):
HIGH-PRIORITY MOMENTS:
✅ Emotional explosions (shock, rage, joy, disbelief)
✅ Contradictions/plot twists ("But then..." moments)
✅ Universal relatability (everyone's experienced this)
✅ Quotable wisdom/controversial takes
✅ "Did they just say that?!" moments
✅ Educational breakthroughs (lightbulb moments)

LOW-PRIORITY (Skip):
❌ Transitions, filler words, setup without payoff
❌ Technical explanations without emotional hooks
❌ Repetitive content

⚙️ DEVELOP (Clip Creation):
For each selected moment:

TIMING RULES:
- ${minClipDuration}-${maxClipDuration} seconds only - EXPAND clips to reach minimum duration
- Start MUCH EARLIER to include setup, context, and build-up
- End MUCH LATER to include full payoff, reactions, and aftermath
- Natural sentence boundaries (complete thoughts)
- Include FULL story arc with adequate context before and after viral moment
- If core moment is 3-8 seconds, ADD 10-20 seconds of setup/context before and after
- NEVER create clips shorter than ${minClipDuration} seconds - always expand timeframe

TEXT CREATION:
1. TITLE (SEO-Focused):
   - Keywords + emotion + specificity
   - "How [Person] [Action] [Surprising Result]"
   - "The [Adjective] [Noun] That [Verb] [Outcome]"

2. TEMPLATE HEADER (Hook-Focused):
   - Emotion + curiosity gap
   - Use successful patterns from proven examples:
     * "She accidentally bet all her money and won big 💰"
     * "You don't have to be Smart to be Successful"
     * "Only a billionaire could have this problem 🤣"
     * "You realise the pure happiness is in chasing your goals:"
     * "That one friend who just texts you 'here'"
     * "when I text '🦷🍓🦷🍓' this is what I mean:"

VIRALITY SCORING:
- 90-100: Instant shareability, meme potential
- 80-89: High engagement, strong hook
- 70-79: Solid content, good retention  
- 60-69: Good viral potential
- 50-59: Baseline threshold - still usable
- <50: Reject

📤 DELIVER:
Return ONLY this JSON array format:

[
  {
    "startTime": 45.2,
    "endTime": 67.8,
    "duration": 22.6,
    "title": "SEO-optimized descriptive title",
    "templateHeader": "Punchy viral social media hook",
    "reason": "Specific viral trigger explanation",
    "viralityScore": 85,
    "engagementType": "reaction|educational|funny|dramatic|relatable",
    "hasSetup": true,
    "hasPayoff": true,
    "contentTags": ["emotion", "surprise", "quotable"]
  }
]

<<CONSTRAINTS>>
- viralityScore ≥ 50 minimum (lowered threshold for more clips)
- Target: AT LEAST 10 clips when possible (prioritize quantity + quality)
- Maximum ${maxClips} clips total
- Timestamps within transcription bounds
- Complete context - don't cut mid-thought or mid-story
- Include setup + payoff in each clip
- CRITICAL: ALL clips must be ${minClipDuration}-${maxClipDuration} seconds
- If viral moment is short, EXPAND the timeframe by adding context before/after
- JSON format only, no explanations outside array

EXAMPLE: If viral moment is at 102-108s (6s), expand to 95-125s (30s) with context
`;

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
        if (!clip.startTime || !clip.endTime || !clip.title || !clip.templateHeader) {
          console.warn(`❌ [DEEPSEEK] Skipping invalid clip: missing required fields`, {
            startTime: clip.startTime,
            endTime: clip.endTime,
            title: clip.title,
            templateHeader: clip.templateHeader
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

        // Validate virality score (lowered to 50 for more clips)
        if (clip.viralityScore < 50) {
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