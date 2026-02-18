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
    
    // Check if transcript is too long and needs chunking
    if (needsChunking(transcription)) {
      console.log(`📏 [DEEPSEEK] Transcript is too long, using MapReduce analysis`);
      return await analyzeWithMapReduce(transcription, options);
    }
    
    console.log(`📏 [DEEPSEEK] Transcript fits in token limit, using single analysis`);

    // Prepare transcription data for DeepSeek
    const segmentsText = transcription.segments
      .map(segment => `[${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s]: ${segment.text}`)
      .join('\n');

    // Create intelligent analysis prompt using 4-D Methodology
    const analysisPrompt = `
<<SYSTEM>>
You are CLIPMASTER-AI: Elite viral content strategist with 10+ years creating billion-view content across TikTok, Instagram, YouTube. You find moments that are BOTH viral AND standalone — clips that explode on social media without needing context from the full video.

<<OBJECTIVE>>
Find moments that hit BOTH criteria:
1. VIRAL — has emotional punch, shareability, hook potential
2. STANDALONE — makes complete sense to someone who has NEVER seen the full video

A clip that's viral but confusing without context = useless.
A clip that's standalone but boring = useless.
You need BOTH.

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Type: ${videoType}
- Duration: ${transcription.duration?.toFixed(1) || 'unknown'}s
- Language: ${transcription.language || 'auto-detected'}

TRANSCRIPTION:
${segmentsText}

<<VIRAL TRIGGERS — What makes people share>>
Hunt for these moments:
🔥 Emotional explosions (shock, rage, joy, disbelief)
🔥 Contradictions/plot twists ("But then..." moments)
🔥 Universal relatability (everyone's experienced this)
🔥 Quotable wisdom or controversial hot takes
🔥 "Did they just say that?!" moments
🔥 Educational breakthroughs (lightbulb moments)
🔥 Humor — punchlines, absurd situations, perfect timing
🔥 Inspirational or motivational peaks

<<STANDALONE TEST — EVERY VIRAL MOMENT MUST ALSO PASS THIS>>
Before including ANY clip, ask: "If a stranger sees this with ZERO context, would they:"
1. Understand what's being discussed without confusion?
2. Get the point, joke, lesson, or story without prior context?
3. Feel the emotional impact without knowing what came before?

If ANY answer is NO → SKIP, no matter how viral the moment feels.

ALWAYS SKIP (viral but NOT standalone):
❌ Epic reactions to something that happened earlier — viewer won't know what triggered it
❌ Punchlines that depend on setup from minutes ago
❌ "So that's why..." conclusions without the premise
❌ References to "what I said earlier" or "like we discussed"
❌ Pronouns without clear referents ("He did THIS thing" — who? what?)
❌ Arguments where you need the other side's point
❌ Generic intros — "Hey guys welcome back", "What's up everyone", "Before we start" — these are filler, not content. NEVER start a clip with a generic intro that doesn't immediately establish the topic
❌ Intro segments where the speaker is just greeting, thanking subscribers, or explaining what the video will be about — a clip of someone describing what they're GOING to talk about is not a clip worth watching
❌ Outros — "Thanks for watching", "Don't forget to like and subscribe", "See you in the next one" — this is channel housekeeping, not content
❌ Mid-stream sponsor reads / ad segments — "This video is sponsored by...", "Before we continue, let me tell you about...", "Use code X for Y% off" — skip entirely, never include any part of a sponsorship or ad read in a clip

THE SWEET SPOT — Viral AND Standalone (prioritize these):
✅ Self-contained stories with setup, tension, AND payoff all in the clip
✅ Hot takes or opinions that need no backstory and trigger reactions
✅ Funny anecdotes where the speaker sets up AND delivers the punchline
✅ Emotional moments where the WHY is clear from the clip itself
✅ Shocking revelations that are self-explanatory
✅ Standalone advice that's genuinely surprising or counter-intuitive
✅ Quotable one-liners with enough surrounding context to land

<<CLIP CREATION RULES>>

FINDING THE RIGHT BOUNDARIES:
- Find where the SELF-CONTAINED THOUGHT begins and ends
- The clip should start where the topic/story is INTRODUCED
- The clip should end where the thought CONCLUDES with its payoff
- Include enough setup so the viral moment LANDS for a new viewer
- ${minClipDuration}-${maxClipDuration} seconds per clip
- Natural sentence boundaries — never cut mid-sentence

TEXT CREATION:
1. TITLE (50-80 chars): SEO-optimized — keywords + emotion + specificity
   - "How [Person] [Action] [Surprising Result]"
   - "The [Adjective] Truth About [Topic] That Nobody Talks About"
2. TEMPLATE HEADER (<50 chars): Viral hook for social overlays
   - Emotion + curiosity gap that matches what the clip actually delivers
   - Examples: "This changed how I see money forever 💰" / "Nobody was ready for this take 🔥"

SCORING (must be strong on BOTH axes):
- 90-100: Instant share potential + fully standalone — the holy grail
- 80-89: High viral energy + strong standalone — great clip
- 70-79: Good engagement + clear standalone message — solid clip
- 60-69: Decent viral potential + mostly standalone — usable
- <60: Reject — either too confusing or too boring

📤 DELIVER:
Return ONLY this JSON array:

[
  {
    "startTime": 45.2,
    "endTime": 67.8,
    "duration": 22.6,
    "title": "SEO title summarizing the clip's standalone viral moment",
    "templateHeader": "Punchy hook that works without full video context",
    "reason": "Why this is both viral AND standalone",
    "viralityScore": 85,
    "engagementType": "reaction|educational|funny|dramatic|relatable",
    "standaloneRating": "full|high|moderate",
    "contentTags": ["self-contained", "emotional", "shareable"]
  }
]

<<CONSTRAINTS>>
- viralityScore ≥ 60 minimum
- Target: up to ${maxClips} clips — but only include clips that are BOTH viral and standalone
- 5 great clips that go viral > 10 mediocre clips nobody shares
- Timestamps within transcription bounds
- ALL clips must be ${minClipDuration}-${maxClipDuration} seconds
- JSON format only, no explanations outside array
- If no moments are both viral AND standalone, return fewer clips — never force it
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

        // Validate virality score (standalone quality threshold)
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

/**
 * Check if transcript needs chunking based on token limits
 * @param {Object} transcription - Whisper transcription result
 * @returns {boolean} - True if chunking is needed
 */
function needsChunking(transcription) {
  const segmentsText = transcription.segments
    .map(segment => `[${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s]: ${segment.text}`)
    .join('\n');
  
  // DeepSeek limit: 128K tokens, but we leave buffer for prompt + response
  const MAX_TOKENS = 100000; // 100K token safety limit
  const estimatedTokens = estimateTokens(segmentsText);
  
  console.log(`📏 [DEEPSEEK] Transcript tokens: ${estimatedTokens}, Limit: ${MAX_TOKENS}`);
  
  return estimatedTokens > MAX_TOKENS;
}

/**
 * Chunk transcript into overlapping segments for MapReduce analysis
 * @param {Object} transcription - Whisper transcription result
 * @param {number} chunkDurationMinutes - Duration per chunk in minutes
 * @param {number} overlapMinutes - Overlap between chunks in minutes
 * @returns {Array} - Array of transcript chunks with metadata
 */
function chunkTranscript(transcription, chunkDurationMinutes = 30, overlapMinutes = 10) {
  const chunkDuration = chunkDurationMinutes * 60; // Convert to seconds
  const overlapDuration = overlapMinutes * 60; // Convert to seconds
  const totalDuration = transcription.duration;
  
  console.log(`✂️ [DEEPSEEK] Chunking ${totalDuration.toFixed(1)}s transcript into ${chunkDurationMinutes}min chunks with ${overlapMinutes}min overlap`);
  
  const chunks = [];
  let currentStart = 0;
  let chunkIndex = 0;
  
  while (currentStart < totalDuration) {
    const chunkEnd = Math.min(currentStart + chunkDuration, totalDuration);
    
    // Find segments that fall within this chunk timeframe
    const chunkSegments = transcription.segments.filter(segment => {
      return segment.start >= currentStart && segment.start < chunkEnd;
    });
    
    if (chunkSegments.length === 0) {
      // No segments in this chunk, move to next
      currentStart = chunkEnd;
      continue;
    }
    
    // Create chunk metadata
    const chunkData = {
      index: chunkIndex,
      startTime: currentStart,
      endTime: chunkEnd,
      duration: chunkEnd - currentStart,
      segments: chunkSegments,
      totalSegments: chunkSegments.length,
      // Create the formatted text for this chunk
      segmentsText: chunkSegments
        .map(segment => `[${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s]: ${segment.text}`)
        .join('\n')
    };
    
    // Calculate token estimate for this chunk
    chunkData.estimatedTokens = estimateTokens(chunkData.segmentsText);
    
    chunks.push(chunkData);
    
    console.log(`📄 [DEEPSEEK] Chunk ${chunkIndex + 1}: ${currentStart.toFixed(1)}s-${chunkEnd.toFixed(1)}s (${chunkData.totalSegments} segments, ~${chunkData.estimatedTokens} tokens)`);
    
    chunkIndex++;
    
    // Move to next chunk with overlap
    // If this is the last possible chunk, break
    if (chunkEnd >= totalDuration) break;
    
    currentStart = chunkEnd - overlapDuration;
  }
  
  console.log(`✅ [DEEPSEEK] Created ${chunks.length} chunks for MapReduce processing`);
  
  return chunks;
}

/**
 * Analyze single chunk with DeepSeek (MAP phase)
 * @param {Object} chunk - Transcript chunk data
 * @param {Object} options - Analysis options
 * @param {number} chunkIndex - Index of current chunk
 * @param {number} totalChunks - Total number of chunks
 * @returns {Promise<Object>} - Chunk analysis result
 */
async function analyzeChunkWithDeepSeek(chunk, options, chunkIndex, totalChunks) {
  const {
    minClipDuration = 15,
    maxClipDuration = 60,
    maxClips = 10,
    videoTitle = 'Video',
    videoType = 'general'
  } = options;

  console.log(`🧠 [DEEPSEEK-MAP] Analyzing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.startTime.toFixed(1)}s-${chunk.endTime.toFixed(1)}s)`);

  // Create chunk-specific analysis prompt
  const analysisPrompt = `
<<SYSTEM>>
You are CLIPMASTER-AI: Elite viral content strategist. You find moments that are BOTH viral AND standalone — clips that explode on social media without needing context from the full video.

You are analyzing CHUNK ${chunkIndex + 1} of ${totalChunks} from a longer video.

<<OBJECTIVE>>
Find moments that hit BOTH criteria:
1. VIRAL — has emotional punch, shareability, hook potential
2. STANDALONE — makes complete sense to someone who has NEVER seen the full video

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Type: ${videoType}
- Chunk: ${chunkIndex + 1}/${totalChunks}
- Chunk Timeframe: ${chunk.startTime.toFixed(1)}s-${chunk.endTime.toFixed(1)}s
- Language: ${options.language || 'auto-detected'}

TRANSCRIPTION SEGMENT:
${chunk.segmentsText}

<<VIRAL TRIGGERS — What makes people share>>
🔥 Emotional explosions (shock, rage, joy, disbelief)
🔥 Contradictions/plot twists ("But then..." moments)
🔥 Universal relatability (everyone's experienced this)
🔥 Quotable wisdom or controversial hot takes
🔥 "Did they just say that?!" moments
🔥 Educational breakthroughs / humor / inspirational peaks

<<STANDALONE TEST — EVERY VIRAL MOMENT MUST ALSO PASS THIS>>
Ask: "If a stranger sees this with ZERO context, would they understand it and feel the impact?"
If NO → SKIP, no matter how viral it feels.

ALWAYS SKIP (viral but NOT standalone):
❌ Reactions to something that happened earlier — viewer won't know the trigger
❌ Punchlines depending on setup from outside the clip
❌ "So that's why..." conclusions without the premise
❌ References to earlier discussion / pronouns without clear referents
❌ Generic intros — "Hey guys welcome back", "What's up everyone" — filler, not content. NEVER start a clip with a greeting that doesn't immediately establish the topic
❌ Intro segments of someone greeting, thanking subscribers, or previewing what the video will cover — a clip of someone describing what they're GOING to talk about is not worth watching
❌ Outros — "Thanks for watching", "Like and subscribe", "See you next time" — channel housekeeping, not content
❌ Mid-stream sponsor reads / ad segments — "This video is sponsored by...", "Use code X for Y% off" — skip entirely

THE SWEET SPOT — Viral AND Standalone:
✅ Self-contained stories with setup, tension, AND payoff in the clip
✅ Hot takes that need no backstory and trigger reactions
✅ Funny anecdotes with setup AND punchline within the clip
✅ Shocking revelations that are self-explanatory
✅ Quotable lines with enough context to land

<<CLIP CREATION RULES>>
- Find where the SELF-CONTAINED THOUGHT begins and ends
- Include enough setup so the viral moment LANDS for a new viewer
- ${minClipDuration}-${maxClipDuration} seconds per clip
- Natural sentence boundaries — never cut mid-sentence
- TITLE (50-80 chars): SEO-optimized — keywords + emotion + specificity
- TEMPLATE HEADER (<50 chars): Viral hook that works without full video context

SCORING (must be strong on BOTH axes):
- 90-100: Instant share + fully standalone — the holy grail
- 80-89: High viral energy + strong standalone
- 70-79: Good engagement + clear standalone message
- 60-69: Decent viral + mostly standalone
- <60: Reject

📤 DELIVER:
Return ONLY this JSON array:

[
  {
    "startTime": 1245.2,
    "endTime": 1267.8,
    "duration": 22.6,
    "title": "SEO title summarizing the standalone viral moment",
    "templateHeader": "Punchy hook that works without full video context",
    "reason": "Why this is both viral AND standalone",
    "viralityScore": 85,
    "engagementType": "reaction|educational|funny|dramatic|relatable",
    "standaloneRating": "full|high|moderate",
    "contentTags": ["self-contained", "emotional", "shareable"],
    "chunkIndex": ${chunkIndex}
  }
]

<<CONSTRAINTS>>
- viralityScore ≥ 60 minimum
- Maximum ${Math.min(maxClips, 5)} clips per chunk
- Timestamps within chunk bounds (${chunk.startTime.toFixed(1)}-${chunk.endTime.toFixed(1)}s)
- JSON format only, no explanations outside array
- If no moments are both viral AND standalone in this chunk, return empty array
`;

  try {
    const startTime = Date.now();
    const deepseekResponse = await callDeepSeekAPI(analysisPrompt);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`⚡ [DEEPSEEK-MAP] Chunk ${chunkIndex + 1} analyzed in ${processingTime}s`);

    // Parse and validate response
    let chunkClips;
    try {
      chunkClips = JSON.parse(deepseekResponse.content);
    } catch (parseError) {
      console.log(`🔄 [DEEPSEEK-MAP] Chunk ${chunkIndex + 1}: Attempting to extract JSON from response...`);
      const jsonMatch = deepseekResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        chunkClips = JSON.parse(jsonMatch[0]);
      } else {
        console.warn(`❌ [DEEPSEEK-MAP] Chunk ${chunkIndex + 1}: No valid JSON found`);
        chunkClips = [];
      }
    }

    // Validate clips for this chunk
    const validClips = (chunkClips || [])
      .filter(clip => {
        // Basic validation
        if (!clip.startTime || !clip.endTime || !clip.title) return false;
        
        const duration = clip.endTime - clip.startTime;
        if (duration < minClipDuration || duration > maxClipDuration) return false;
        
        // Ensure clip is within chunk bounds
        if (clip.startTime < chunk.startTime || clip.endTime > chunk.endTime) return false;
        
        if (clip.viralityScore < 60) return false;

        return true;
      })
      .map(clip => ({
        ...clip,
        duration: parseFloat((clip.endTime - clip.startTime).toFixed(1)),
        startTime: parseFloat(clip.startTime.toFixed(1)),
        endTime: parseFloat(clip.endTime.toFixed(1)),
        chunkIndex: chunkIndex,
        processingTime: parseFloat(processingTime),
        source: 'deepseek-v3-chunk'
      }));

    console.log(`✅ [DEEPSEEK-MAP] Chunk ${chunkIndex + 1}: Found ${validClips.length} valid clips`);
    
    return {
      chunkIndex,
      chunkStartTime: chunk.startTime,
      chunkEndTime: chunk.endTime,
      clips: validClips,
      processingTime: parseFloat(processingTime),
      cost: calculateDeepSeekCost(analysisPrompt, deepseekResponse.content),
      estimatedTokens: chunk.estimatedTokens
    };

  } catch (error) {
    console.error(`❌ [DEEPSEEK-MAP] Chunk ${chunkIndex + 1} analysis failed:`, error);
    return {
      chunkIndex,
      chunkStartTime: chunk.startTime,
      chunkEndTime: chunk.endTime,
      clips: [],
      error: error.message,
      processingTime: 0,
      cost: 0
    };
  }
}

/**
 * Merge and deduplicate clips from all chunks (REDUCE phase)
 * @param {Array} chunkResults - Results from all chunk analyses
 * @param {Object} options - Analysis options
 * @returns {Array} - Final merged and deduplicated clips
 */
function mergeAndDeduplicateClips(chunkResults, options) {
  const { maxClips = 10 } = options;
  
  console.log(`🔄 [DEEPSEEK-REDUCE] Merging clips from ${chunkResults.length} chunks`);
  
  // Collect all clips from all chunks
  const allClips = [];
  let totalProcessingTime = 0;
  let totalCost = 0;
  
  chunkResults.forEach(result => {
    if (result.clips && result.clips.length > 0) {
      allClips.push(...result.clips);
      console.log(`📊 [DEEPSEEK-REDUCE] Chunk ${result.chunkIndex + 1}: ${result.clips.length} clips`);
    }
    totalProcessingTime += result.processingTime || 0;
    totalCost += result.cost || 0;
  });
  
  console.log(`📋 [DEEPSEEK-REDUCE] Total clips before deduplication: ${allClips.length}`);
  
  if (allClips.length === 0) {
    console.log(`⚠️ [DEEPSEEK-REDUCE] No clips found in any chunks`);
    return {
      clips: [],
      totalProcessingTime,
      totalCost,
      deduplicationStats: { original: 0, duplicates: 0, final: 0 }
    };
  }
  
  // Sort by virality score (highest first)
  allClips.sort((a, b) => b.viralityScore - a.viralityScore);
  
  // Deduplicate clips that are too close to each other
  const OVERLAP_THRESHOLD = 5; // seconds
  const deduplicatedClips = [];
  
  for (const clip of allClips) {
    const isDuplicate = deduplicatedClips.some(existingClip => {
      // Check if clips overlap significantly
      const overlapStart = Math.max(clip.startTime, existingClip.startTime);
      const overlapEnd = Math.min(clip.endTime, existingClip.endTime);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      // If overlap is more than threshold, consider it duplicate
      return overlapDuration > OVERLAP_THRESHOLD;
    });
    
    if (!isDuplicate) {
      deduplicatedClips.push({
        ...clip,
        analyzedAt: new Date().toISOString(),
        source: 'deepseek-v3-mapreduce'
      });
    } else {
      console.log(`🗑️ [DEEPSEEK-REDUCE] Removed duplicate clip: "${clip.title}" (${clip.startTime}s-${clip.endTime}s)`);
    }
  }
  
  // Limit to maxClips
  const finalClips = deduplicatedClips.slice(0, maxClips);
  
  console.log(`✅ [DEEPSEEK-REDUCE] Final clips: ${finalClips.length}/${allClips.length} (removed ${allClips.length - deduplicatedClips.length} duplicates, kept top ${finalClips.length})`);
  
  // Log final clips
  finalClips.forEach((clip, index) => {
    console.log(`  ${index + 1}. "${clip.title}" (${clip.startTime}s-${clip.endTime}s, score: ${clip.viralityScore})`);
  });
  
  return {
    clips: finalClips,
    totalProcessingTime,
    totalCost,
    deduplicationStats: {
      original: allClips.length,
      duplicates: allClips.length - deduplicatedClips.length,
      final: finalClips.length
    }
  };
}

/**
 * MapReduce analysis for long transcriptions
 * @param {Object} transcription - Whisper transcription result
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeWithMapReduce(transcription, options) {
  console.log(`🗺️ [DEEPSEEK-MAPREDUCE] Starting MapReduce analysis for long transcription`);
  
  // Step 1: Chunk the transcript
  const chunks = chunkTranscript(transcription, 30, 10); // 30min chunks, 10min overlap
  
  console.log(`🚀 [DEEPSEEK-MAPREDUCE] MAP Phase: Processing ${chunks.length} chunks in parallel`);
  
  // Step 2: MAP Phase - Analyze all chunks in parallel
  const chunkAnalysisPromises = chunks.map((chunk, index) => 
    analyzeChunkWithDeepSeek(chunk, options, index, chunks.length)
  );
  
  const chunkResults = await Promise.all(chunkAnalysisPromises);
  
  // Step 3: REDUCE Phase - Merge and deduplicate results
  console.log(`🔄 [DEEPSEEK-MAPREDUCE] REDUCE Phase: Merging results from ${chunkResults.length} chunks`);
  
  const mergeResult = mergeAndDeduplicateClips(chunkResults, options);
  
  console.log(`🎉 [DEEPSEEK-MAPREDUCE] MapReduce completed: ${mergeResult.clips.length} final clips in ${mergeResult.totalProcessingTime.toFixed(2)}s`);
  
  return {
    success: true,
    clips: mergeResult.clips,
    totalClips: mergeResult.clips.length,
    processingTime: mergeResult.totalProcessingTime,
    cost: mergeResult.totalCost,
    metadata: {
      model: 'deepseek-chat-v3-mapreduce',
      totalChunks: chunks.length,
      deduplicationStats: mergeResult.deduplicationStats,
      cacheHit: false
    }
  };
}

export default {
  analyzeContentWithDeepSeek,
  calculateDeepSeekCost,
  estimateTokens
};