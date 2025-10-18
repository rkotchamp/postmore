import { create } from "zustand";

/**
 * Share Store - Manages state for sharing clips to social media platforms
 * Handles both individual clip sharing (1→N) and bulk sharing (M→N)
 */
export const useShareStore = create((set, get) => ({
  // ============================================
  // SELECTION STATE
  // ============================================
  selectedAccounts: [], // Array of account objects with {id, platform, username, profileImage, etc}
  selectedClips: [], // Array of clip objects with {id, title, videoUrl, thumbnail, etc}

  // ============================================
  // CAPTION CONFIGURATION
  // ============================================
  captionMode: 'single', // 'single' | 'per-account' | 'per-clip'
  singleCaption: '', // Used when captionMode is 'single'
  accountCaptions: {}, // { [accountId]: caption } - Used when captionMode is 'per-account'
  clipCaptions: {}, // { [clipId]: caption } - Used when captionMode is 'per-clip'

  // ============================================
  // SHARING MATRIX (for bulk sharing M→N)
  // ============================================
  // Map of enabled clip-account pairs: { "clipId-accountId": true/false }
  // This allows users to toggle specific combinations on/off
  sharingMatrix: {},

  // ============================================
  // SHARING PROGRESS & STATUS
  // ============================================
  isSharing: false,
  shareProgress: {
    total: 0, // Total number of clip-account pairs to share
    completed: 0, // Number of completed shares
    failed: 0, // Number of failed shares
    current: null, // Currently processing pair: { clipId, accountId, clipTitle, accountName }
  },

  // Detailed status for each clip-account pair
  // { "clipId-accountId": { status: 'pending'|'uploading'|'success'|'failed', error: null|string, postUrl: null|string } }
  pairStatus: {},

  // ============================================
  // SHARING OPTIONS
  // ============================================
  shareOptions: {
    scheduleType: 'immediate', // 'immediate' | 'scheduled'
    scheduledAt: null, // Date object for scheduled posts
    visibility: 'public', // 'public' | 'private' | 'unlisted' (platform-specific)
    allowComments: true,
    allowDuet: true, // TikTok-specific
    allowStitch: true, // TikTok-specific
  },

  // ============================================
  // UI STATE
  // ============================================
  showShareModal: false,
  showProgressModal: false,
  currentStep: 'accounts', // 'accounts' | 'captions' | 'schedule' | 'review' | 'sharing'

  // ============================================
  // ACTIONS - Selection
  // ============================================
  setSelectedAccounts: (accounts) => set({ selectedAccounts: accounts }),
  addAccount: (account) => set((state) => ({
    selectedAccounts: [...state.selectedAccounts, account]
  })),
  removeAccount: (accountId) => set((state) => ({
    selectedAccounts: state.selectedAccounts.filter(acc => acc.id !== accountId)
  })),
  toggleAccount: (account) => set((state) => {
    const isSelected = state.selectedAccounts.some(acc => acc.id === account.id);
    if (isSelected) {
      return { selectedAccounts: state.selectedAccounts.filter(acc => acc.id !== account.id) };
    } else {
      return { selectedAccounts: [...state.selectedAccounts, account] };
    }
  }),
  clearAccounts: () => set({ selectedAccounts: [] }),

  setSelectedClips: (clips) => set({ selectedClips: clips }),
  clearClips: () => set({ selectedClips: [] }),

  // ============================================
  // ACTIONS - Captions
  // ============================================
  setCaptionMode: (mode) => set({ captionMode: mode }),
  setSingleCaption: (caption) => set({ singleCaption: caption }),
  setAccountCaption: (accountId, caption) => set((state) => ({
    accountCaptions: { ...state.accountCaptions, [accountId]: caption }
  })),
  setClipCaption: (clipId, caption) => set((state) => ({
    clipCaptions: { ...state.clipCaptions, [clipId]: caption }
  })),
  clearCaptions: () => set({
    singleCaption: '',
    accountCaptions: {},
    clipCaptions: {}
  }),

  // ============================================
  // ACTIONS - Sharing Matrix
  // ============================================
  initializeSharingMatrix: () => {
    const state = get();
    const matrix = {};

    // Create all possible clip-account pairs and enable them by default
    state.selectedClips.forEach(clip => {
      state.selectedAccounts.forEach(account => {
        const pairKey = `${clip.id}-${account.id}`;
        // Check platform compatibility (you can add more sophisticated logic here)
        const isCompatible = checkPlatformCompatibility(clip, account);
        matrix[pairKey] = isCompatible;
      });
    });

    set({ sharingMatrix: matrix });
  },

  togglePair: (clipId, accountId) => set((state) => {
    const pairKey = `${clipId}-${accountId}`;
    return {
      sharingMatrix: {
        ...state.sharingMatrix,
        [pairKey]: !state.sharingMatrix[pairKey]
      }
    };
  }),

  enableAllPairs: () => {
    const state = get();
    const matrix = { ...state.sharingMatrix };
    Object.keys(matrix).forEach(key => {
      matrix[key] = true;
    });
    set({ sharingMatrix: matrix });
  },

  disableAllPairs: () => {
    const state = get();
    const matrix = { ...state.sharingMatrix };
    Object.keys(matrix).forEach(key => {
      matrix[key] = false;
    });
    set({ sharingMatrix: matrix });
  },

  // ============================================
  // ACTIONS - Sharing Progress
  // ============================================
  startSharing: () => set((state) => ({
    isSharing: true,
    showProgressModal: true,
    shareProgress: {
      total: Object.values(state.sharingMatrix).filter(enabled => enabled).length,
      completed: 0,
      failed: 0,
      current: null
    },
    pairStatus: {}
  })),

  updateShareProgress: (clipId, accountId, status, error = null, postUrl = null) => {
    const pairKey = `${clipId}-${accountId}`;
    set((state) => {
      const newPairStatus = {
        ...state.pairStatus,
        [pairKey]: { status, error, postUrl }
      };

      // Update counters
      const completed = Object.values(newPairStatus).filter(s => s.status === 'success').length;
      const failed = Object.values(newPairStatus).filter(s => s.status === 'failed').length;

      return {
        pairStatus: newPairStatus,
        shareProgress: {
          ...state.shareProgress,
          completed,
          failed,
          current: status === 'uploading' ? { clipId, accountId } : state.shareProgress.current
        }
      };
    });
  },

  completeSharing: () => set({
    isSharing: false,
    shareProgress: {
      ...get().shareProgress,
      current: null
    }
  }),

  // ============================================
  // ACTIONS - Share Options
  // ============================================
  setShareOptions: (options) => set((state) => ({
    shareOptions: { ...state.shareOptions, ...options }
  })),

  setScheduleType: (type) => set((state) => ({
    shareOptions: { ...state.shareOptions, scheduleType: type }
  })),

  setScheduledAt: (date) => set((state) => ({
    shareOptions: { ...state.shareOptions, scheduledAt: date }
  })),

  // ============================================
  // ACTIONS - UI State
  // ============================================
  setShowShareModal: (show) => set({ showShareModal: show }),
  setShowProgressModal: (show) => set({ showProgressModal: show }),
  setCurrentStep: (step) => set({ currentStep: step }),

  // ============================================
  // ACTIONS - Navigation
  // ============================================
  goToNextStep: () => {
    const state = get();
    const steps = ['accounts', 'captions', 'schedule', 'review', 'sharing'];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      set({ currentStep: steps[currentIndex + 1] });
    }
  },

  goToPreviousStep: () => {
    const state = get();
    const steps = ['accounts', 'captions', 'schedule', 'review', 'sharing'];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      set({ currentStep: steps[currentIndex - 1] });
    }
  },

  // ============================================
  // ACTIONS - Reset
  // ============================================
  resetShareState: () => set({
    selectedAccounts: [],
    selectedClips: [],
    captionMode: 'single',
    singleCaption: '',
    accountCaptions: {},
    clipCaptions: {},
    sharingMatrix: {},
    isSharing: false,
    shareProgress: {
      total: 0,
      completed: 0,
      failed: 0,
      current: null
    },
    pairStatus: {},
    shareOptions: {
      scheduleType: 'immediate',
      scheduledAt: null,
      visibility: 'public',
      allowComments: true,
      allowDuet: true,
      allowStitch: true,
    },
    showShareModal: false,
    showProgressModal: false,
    currentStep: 'accounts'
  }),

  // ============================================
  // COMPUTED GETTERS
  // ============================================
  getEnabledPairs: () => {
    const state = get();
    return Object.entries(state.sharingMatrix)
      .filter(([_, enabled]) => enabled)
      .map(([pairKey, _]) => {
        const [clipId, accountId] = pairKey.split('-');
        const clip = state.selectedClips.find(c => c.id === clipId);
        const account = state.selectedAccounts.find(a => a.id === accountId);
        return { clipId, accountId, clip, account };
      });
  },

  getCaptionForPair: (clipId, accountId) => {
    const state = get();
    switch (state.captionMode) {
      case 'single':
        return state.singleCaption;
      case 'per-account':
        return state.accountCaptions[accountId] || '';
      case 'per-clip':
        return state.clipCaptions[clipId] || '';
      default:
        return '';
    }
  },

  isReadyToShare: () => {
    const state = get();
    const hasAccounts = state.selectedAccounts.length > 0;
    const hasClips = state.selectedClips.length > 0;
    const hasEnabledPairs = Object.values(state.sharingMatrix).some(enabled => enabled);

    // Captions are optional, so don't require them
    return hasAccounts && hasClips && hasEnabledPairs;
  }
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a clip is compatible with a platform account
 * @param {Object} clip - Clip object with video metadata
 * @param {Object} account - Account object with platform info
 * @returns {boolean} - Whether the clip can be shared to this account
 */
function checkPlatformCompatibility(clip, account) {
  const platform = account.platform?.toLowerCase();

  // TikTok prefers vertical videos (9:16)
  if (platform === 'tiktok') {
    return clip.verticalVideoUrl || clip.aspectRatio === '9:16';
  }

  // YouTube Shorts prefers vertical videos
  if (platform === 'ytshorts' || platform === 'youtube-shorts') {
    return clip.verticalVideoUrl || clip.aspectRatio === '9:16';
  }

  // Instagram Reels prefers vertical videos
  if (platform === 'instagram') {
    return clip.verticalVideoUrl || clip.aspectRatio === '9:16';
  }

  // YouTube regular videos prefer horizontal
  if (platform === 'youtube') {
    return clip.horizontalVideoUrl || clip.aspectRatio === '16:9';
  }

  // Twitter/X supports both
  if (platform === 'twitter' || platform === 'x') {
    return true;
  }

  // Default: assume compatible
  return true;
}

// ============================================
// SELECTORS (for performance optimization)
// ============================================
export const selectSelectedAccounts = (state) => state.selectedAccounts;
export const selectSelectedClips = (state) => state.selectedClips;
export const selectCaptionMode = (state) => state.captionMode;
export const selectIsSharing = (state) => state.isSharing;
export const selectShareProgress = (state) => state.shareProgress;
export const selectEnabledPairs = (state) => state.getEnabledPairs();
