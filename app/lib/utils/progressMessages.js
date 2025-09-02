/**
 * GenZ Progress Messages for Video Clippers
 * Hard-coded messages to keep users engaged during long processing times
 */

const PROGRESS_MESSAGES = {
  downloading: [
    "getting the sauce 🌶️",
    "downloading fire 🔥",
    "we're cooking 👨‍🍳",
    "almost got it 💯",
    "this bout to hit 📈",
    "collecting W's 🏆",
    "securing the bag 💰",
    "loading greatness ⭐"
  ],
  
  transcribing: [
    "reading the vibes ✨",
    "decoding chaos 🧩",
    "speedrunning it 🏃‍♂️",
    "finding bangers 🎵",
    "AI working overtime 🤖",
    "halfway there bestie ⏰",
    "breaking it down 🔥",
    "this taking forever ngl 😅",
    "patience is key 🗝️",
    "trust the process 💪"
  ],
  
  analyzing: [
    "hunting viral moments 🎯",
    "ranking the clips 👑",
    "this one's different 🔥",
    "found some heat 💥",
    "AI choosing sides 😤",
    "bout to be iconic ✨",
    "picking the best 🌟",
    "quality over quantity 💯",
    "searching for gold 🥇",
    "this gonna hit 📈"
  ],
  
  saving: [
    "saving your W's 💾",
    "uploading to cloud ☁️",
    "final boss mode 👑",
    "almost ready to slay 💅",
    "we did that 🌟",
    "securing the clips 🔐",
    "finishing touches ✨",
    "getting it ready 🚀"
  ],
  
  completed: [
    "WE DID THAT! 💥",
    "clips ready to slay 👑",
    "time to go viral 🌟",
    "your moment awaits ✨",
    "ready to break internet 🌐"
  ],
  
  error: [
    "something went wrong 😭",
    "we'll fix this bestie 🔧",
    "technical difficulties 🚨",
    "try again maybe? 🤞"
  ]
};

/**
 * Get a random progress message for the current stage
 * @param {string} stage - Current processing stage
 * @returns {string} - Random GenZ message
 */
export function getRandomProgressMessage(stage) {
  const messages = PROGRESS_MESSAGES[stage];
  if (!messages || messages.length === 0) {
    return "processing your content ⏳";
  }
  
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Get a progress message based on stage and percentage
 * @param {string} stage - Current processing stage
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {string} - Appropriate GenZ message
 */
export function getProgressMessage(stage, percentage) {
  // For completed state
  if (percentage >= 100) {
    return getRandomProgressMessage('completed');
  }
  
  // For error state (if stage is error)
  if (stage === 'error') {
    return getRandomProgressMessage('error');
  }
  
  // Get random message for current stage
  return getRandomProgressMessage(stage);
}

/**
 * Get all available stages
 * @returns {Array<string>} - Array of stage names
 */
export function getAvailableStages() {
  return Object.keys(PROGRESS_MESSAGES).filter(stage => 
    !['completed', 'error'].includes(stage)
  );
}

/**
 * Format progress display for UI
 * @param {string} stage - Current processing stage
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {Object} - Formatted progress data
 */
export function formatProgressDisplay(stage, percentage) {
  const message = getProgressMessage(stage, percentage);
  
  return {
    message,
    percentage: Math.min(100, Math.max(0, percentage)),
    stage,
    isCompleted: percentage >= 100,
    isError: stage === 'error'
  };
}

export default {
  getRandomProgressMessage,
  getProgressMessage,
  getAvailableStages,
  formatProgressDisplay
};