/**
 * Platform Compatibility Utility
 * Simple checks for video format compatibility with different social media platforms
 */

/**
 * Check if a clip is compatible with a platform account
 * @param {Object} clip - Clip object with video metadata
 * @param {Object} account - Account object with platform info
 * @returns {boolean} - Whether the clip can be shared to this account
 */
export function checkPlatformCompatibility(clip, account) {
  const platform = account.platform?.toLowerCase();

  // TikTok prefers vertical videos (9:16)
  if (platform === 'tiktok') {
    return !!(clip.verticalVideoUrl || clip.aspectRatio === '9:16');
  }

  // YouTube Shorts prefers vertical videos
  if (platform === 'ytshorts' || platform === 'youtube-shorts') {
    return !!(clip.verticalVideoUrl || clip.aspectRatio === '9:16');
  }

  // Instagram Reels prefers vertical videos
  if (platform === 'instagram') {
    return !!(clip.verticalVideoUrl || clip.aspectRatio === '9:16');
  }

  // YouTube regular videos prefer horizontal
  if (platform === 'youtube') {
    return !!(clip.horizontalVideoUrl || clip.aspectRatio === '16:9');
  }

  // Twitter/X supports both
  if (platform === 'twitter' || platform === 'x') {
    return true;
  }

  // Default: assume compatible
  return true;
}

/**
 * Get the best video URL for a platform
 * @param {Object} clip
 * @param {string} platform
 * @returns {string|null}
 */
export function getBestVideoUrlForPlatform(clip, platform) {
  const platformLower = platform?.toLowerCase();

  // Vertical-first platforms
  if (['tiktok', 'ytshorts', 'youtube-shorts', 'instagram'].includes(platformLower)) {
    return clip.verticalVideoUrl || clip.videoUrl || clip.horizontalVideoUrl;
  }

  // Horizontal-first platforms
  if (['youtube', 'facebook', 'linkedin'].includes(platformLower)) {
    return clip.horizontalVideoUrl || clip.videoUrl || clip.verticalVideoUrl;
  }

  // Default: return any available URL
  return clip.videoUrl || clip.horizontalVideoUrl || clip.verticalVideoUrl;
}

/**
 * Batch check compatibility for multiple clips and accounts
 * @param {Array} clips
 * @param {Array} accounts
 * @returns {Object} - Matrix of compatibility results
 */
export function batchCheckCompatibility(clips, accounts) {
  const matrix = {};

  clips.forEach(clip => {
    accounts.forEach(account => {
      const key = `${clip.id}-${account.id}`;
      matrix[key] = checkPlatformCompatibility(clip, account);
    });
  });

  return matrix;
}

/**
 * Filter accounts that are compatible with a clip
 * @param {Object} clip
 * @param {Array} accounts
 * @returns {Array} - Compatible accounts
 */
export function getCompatibleAccounts(clip, accounts) {
  return accounts.filter(account => checkPlatformCompatibility(clip, account));
}
