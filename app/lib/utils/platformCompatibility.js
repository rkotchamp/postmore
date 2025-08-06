/**
 * Platform compatibility checker
 * Validates content types against platform requirements
 */

export const PLATFORM_COMPATIBILITY = {
  youtube: {
    name: 'YouTube',
    supportedTypes: ['video'],
    restrictions: {
      video: {
        minDuration: 3, // seconds
        maxDuration: 60, // seconds for Shorts
        formats: ['.mp4', '.mov', '.webm', '.mpeg', '.mpg', '.m4v', '.avi']
      }
    }
  }
};

/**
 * Check compatibility between content and selected platforms
 * @param {Array} mediaFiles - Array of media files
 * @param {Array} selectedAccounts - Array of selected platform accounts
 * @returns {Object} Compatibility result with warnings and incompatible items
 */
export function checkPlatformCompatibility(mediaFiles, selectedAccounts) {
  const result = {
    isCompatible: true,
    warnings: [],
    incompatibleItems: [],
    affectedPlatforms: new Set()
  };

  // If no media files, everything is compatible (text-only post)
  if (!mediaFiles || mediaFiles.length === 0) {
    return result;
  }

  // Group accounts by platform
  const platformAccounts = selectedAccounts.reduce((acc, account) => {
    const platform = account.type || account.platform;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(account);
    return acc;
  }, {});

  // Check each media file against each platform
  mediaFiles.forEach((file, fileIndex) => {
    // Use existing file type from state - either 'image' or 'video'
    const fileType = file.type?.startsWith('image/') ? 'image' : 'video';
    const fileName = file.originalName || file.name || `File ${fileIndex + 1}`;
    const fileSize = file.size || 0;

    Object.keys(platformAccounts).forEach(platform => {
      const platformKey = platform === 'ytShorts' ? 'youtube' : platform;
      const platformConfig = PLATFORM_COMPATIBILITY[platformKey];
      
      if (!platformConfig) return; // Skip unknown platforms

      const accounts = platformAccounts[platform];
      
      // Check if platform supports this file type
      if (!platformConfig.supportedTypes.includes(fileType)) {
        result.isCompatible = false;
        result.affectedPlatforms.add(platformConfig.name);
        
        const incompatibleItem = {
          fileName,
          fileType,
          platform: platformConfig.name,
          platformKey,
          accounts: accounts.map(acc => ({ id: acc.id, name: acc.name })),
          reason: `${platformConfig.name} does not support ${fileType} files`,
          suggestion: getSuggestion(fileType, platformKey)
        };
        
        result.incompatibleItems.push(incompatibleItem);
      }
      
      // Check file size restrictions
      else if (platformConfig.restrictions[fileType]?.maxSize && fileSize > platformConfig.restrictions[fileType].maxSize) {
        result.isCompatible = false;
        result.affectedPlatforms.add(platformConfig.name);
        
        const maxSizeMB = (platformConfig.restrictions[fileType].maxSize / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
        
        const incompatibleItem = {
          fileName,
          fileType,
          platform: platformConfig.name,
          platformKey,
          accounts: accounts.map(acc => ({ id: acc.id, name: acc.name })),
          reason: `File too large for ${platformConfig.name}: ${fileSizeMB}MB (max: ${maxSizeMB}MB)`,
          suggestion: `Compress the ${fileType} to under ${maxSizeMB}MB for ${platformConfig.name}`
        };
        
        result.incompatibleItems.push(incompatibleItem);
      }
    });
  });

  // Generate summary warnings
  if (!result.isCompatible) {
    const platformNames = Array.from(result.affectedPlatforms);
    result.warnings.push(
      `Some content is incompatible with ${platformNames.join(', ')}. These platforms will be skipped during posting.`
    );
  }

  return result;
}


/**
 * Get suggestion for incompatible content
 * @param {string} fileType - The file type
 * @param {string} platform - The platform key
 * @returns {string} Suggestion text
 */
function getSuggestion(fileType, platform) {
  const suggestions = {
    youtube: {
      image: 'YouTube only accepts videos. Consider creating a video slideshow or removing YouTube from your selection.',
      unknown: 'YouTube only accepts video files in MP4, MOV, or other supported video formats.'
    }
  };
  
  return suggestions[platform]?.[fileType] || 'Consider using a supported file format for this platform.';
}

/**
 * Filter out incompatible accounts from submission
 * @param {Array} selectedAccounts - All selected accounts
 * @param {Array} incompatibleItems - Incompatible items from compatibility check
 * @returns {Array} Filtered accounts that are compatible
 */
export function filterCompatibleAccounts(selectedAccounts, incompatibleItems) {
  if (incompatibleItems.length === 0) {
    return selectedAccounts;
  }
  
  // Get all incompatible account IDs
  const incompatibleAccountIds = new Set();
  incompatibleItems.forEach(item => {
    item.accounts.forEach(account => {
      incompatibleAccountIds.add(account.id);
    });
  });
  
  // Filter out incompatible accounts
  return selectedAccounts.filter(account => 
    !incompatibleAccountIds.has(account.id)
  );
}