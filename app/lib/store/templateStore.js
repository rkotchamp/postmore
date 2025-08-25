import { create } from "zustand";

// Template store to handle template settings without triggering React re-renders
export const useTemplateStore = create((set, get) => ({
  // Template Settings
  selectedTemplate: 'default',
  username: '',
  profilePic: '',
  customHeader: '',
  customImage: '',
  bwLevel: 50,
  bwContrast: 130, // 130% contrast for film noir effect
  bwBrightness: 80, // 80% brightness for dramatic look
  overlayColor: '#000000',
  overlayOpacity: 80,
  textColor: '#ffffff',
  selectedText: '',
  selectedTextColor: '#ffffff',
  showTextColorPicker: false,
  
  // UI States
  expanded: false,
  previewCache: {},
  bestPreviewVideo: null,
  
  // Template Application States (NEW - for gallery-wide template application)
  appliedTemplate: null,        // Which template is currently applied to the gallery
  appliedSettings: null,        // Settings when template was applied
  isTemplateApplied: false,     // Whether any template is active on clips

  // Actions
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setUsername: (username) => set({ username }),
  setProfilePic: (profilePic) => set({ profilePic }),
  setCustomHeader: (customHeader) => set({ customHeader }),
  setCustomImage: (customImage) => set({ customImage }),
  setBwLevel: (bwLevel) => set({ bwLevel }),
  setBwContrast: (bwContrast) => set({ bwContrast }),
  setBwBrightness: (bwBrightness) => set({ bwBrightness }),
  setOverlayColor: (overlayColor) => set({ overlayColor }),
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  setTextColor: (textColor) => set({ textColor }),
  setSelectedText: (selectedText) => set({ selectedText }),
  setSelectedTextColor: (selectedTextColor) => set({ selectedTextColor }),
  setShowTextColorPicker: (show) => set({ showTextColorPicker: show }),
  
  // UI Actions
  setExpanded: (expanded) => set({ expanded }),
  setPreviewCache: (cache) => set({ previewCache: cache }),
  setBestPreviewVideo: (video) => set({ bestPreviewVideo: video }),
  
  // Template Application Actions (NEW - for applying templates to entire gallery)
  applyTemplateToGallery: () => {
    const currentState = get();
    set({
      appliedTemplate: currentState.selectedTemplate,
      appliedSettings: {
        username: currentState.username,
        profilePic: currentState.profilePic,
        customHeader: currentState.customHeader,
        customImage: currentState.customImage,
        bwLevel: currentState.bwLevel,
        bwContrast: currentState.bwContrast,
        bwBrightness: currentState.bwBrightness,
        overlayColor: currentState.overlayColor,
        overlayOpacity: currentState.overlayOpacity,
        textColor: currentState.textColor
      },
      isTemplateApplied: true
    });
  },
  clearAppliedTemplate: () => set({
    appliedTemplate: null,
    appliedSettings: null,
    isTemplateApplied: false
  }),
  
  // Clear preview cache when settings change
  clearPreviewCache: () => set({ previewCache: {} }),
  
  // Reset all template settings
  resetTemplate: () => set({
    selectedTemplate: 'default',
    username: '',
    profilePic: '',
    customHeader: '',
    customImage: '',
    bwLevel: 50,
    bwContrast: 130,
    bwBrightness: 80,
    overlayColor: '#000000',
    overlayOpacity: 80,
    textColor: '#ffffff',
    selectedText: '',
    selectedTextColor: '#ffffff',
    showTextColorPicker: false,
    previewCache: {}
  }),

  // Reset UI state (sidebar closed, etc.) - DON'T reset video data
  resetUI: () => set({
    expanded: false,
    showTextColorPicker: false,
    previewCache: {},
    // Clear applied template when resetting UI
    appliedTemplate: null,
    appliedSettings: null,
    isTemplateApplied: false
    // NOTE: Don't reset bestPreviewVideo - let it persist for better UX
  }),

  // Complete reset (both template settings and UI state)
  resetAll: () => set({
    selectedTemplate: 'default',
    username: '',
    profilePic: '',
    customHeader: '',
    customImage: '',
    bwLevel: 50,
    bwContrast: 130,
    bwBrightness: 80,
    overlayColor: '#000000',
    overlayOpacity: 80,
    textColor: '#ffffff',
    selectedText: '',
    selectedTextColor: '#ffffff',
    showTextColorPicker: false,
    expanded: false,
    previewCache: {},
    bestPreviewVideo: null,
    // Clear applied template in complete reset
    appliedTemplate: null,
    appliedSettings: null,
    isTemplateApplied: false
  }),
}));

// Selectors
export const selectSelectedTemplate = (state) => state.selectedTemplate;
export const selectUsername = (state) => state.username;
export const selectCustomHeader = (state) => state.customHeader;
export const selectOverlayColor = (state) => state.overlayColor;
export const selectTextColor = (state) => state.textColor;
export const selectExpanded = (state) => state.expanded;