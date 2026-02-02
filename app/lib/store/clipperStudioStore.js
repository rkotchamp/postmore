import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const CURRENT_SCHEMA_VERSION = "1.0.0";

// Initial state for ClipperStudio
const initialState = {
  _version: CURRENT_SCHEMA_VERSION,
  
  // Input States
  url: "",
  uploadedFile: null,
  
  // UI States  
  hasVideo: false,
  showClipsGallery: false,
  currentProjectId: null, // ID of project whose clips are being viewed
  
  // Loading States
  isLoadingPreview: false,
  isLoadingProcessing: false,
  isExtractingThumbnail: false,
  
  // Temporary Preview Data (before processing)
  previewThumbnail: null,
  previewMetadata: null,
  
  // Active Projects (processing/completed) - These persist across sessions
  activeProjects: [],
  
  // Thumbnail cache to prevent re-extraction
  thumbnailCache: new Map(),
  
  // Selected project for clips gallery
  selectedProjectId: null,
  
  lastUpdatedAt: new Date(),
};

export const useClipperStudioStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // --- Internal helper to update timestamp ---
      _updateTimestamp: () => ({ lastUpdatedAt: new Date() }),

      // --- Input Actions ---
      setUrl: (url) =>
        set((state) => {
          if (typeof url !== "string") {
            console.warn("setUrl: URL must be a string.", url);
            return state;
          }
          if (state.url === url) return state; // No change if identical
          return {
            url,
            uploadedFile: url ? null : state.uploadedFile, // Clear file when URL is set
            ...get()._updateTimestamp(),
          };
        }),

      setUploadedFile: (file) =>
        set((state) => {
          if (file && !(file instanceof File)) {
            console.warn("setUploadedFile: Must be a File object or null.", file);
            return state;
          }
          if (state.uploadedFile === file) return state; // No change if identical
          return {
            uploadedFile: file,
            url: file ? "" : state.url, // Clear URL when file is set
            ...get()._updateTimestamp(),
          };
        }),

      // --- UI State Actions ---
      setHasVideo: (hasVideo) =>
        set((state) => {
          if (typeof hasVideo !== "boolean") {
            console.warn("setHasVideo: Must be a boolean.", hasVideo);
            return state;
          }
          if (state.hasVideo === hasVideo) return state;
          return { hasVideo, ...get()._updateTimestamp() };
        }),

      setShowClipsGallery: (show) =>
        set((state) => {
          if (typeof show !== "boolean") {
            console.warn("setShowClipsGallery: Must be a boolean.", show);
            return state;
          }
          if (state.showClipsGallery === show) return state;
          return { showClipsGallery: show, ...get()._updateTimestamp() };
        }),
      
      setCurrentProjectId: (projectId) =>
        set((state) => {
          // Validate projectId input
          if (projectId !== null && (typeof projectId !== 'string' && typeof projectId !== 'number')) {
            console.warn('setCurrentProjectId: ProjectId must be a string, number, or null.', projectId);
            return state;
          }
          if (state.currentProjectId === projectId) return state;
          return { currentProjectId: projectId, ...get()._updateTimestamp() };
        }),

      // --- Loading State Actions ---
      setLoadingPreview: (loading) =>
        set((state) => {
          if (typeof loading !== "boolean") {
            console.warn("setLoadingPreview: Must be a boolean.", loading);
            return state;
          }
          if (state.isLoadingPreview === loading) return state;
          return { isLoadingPreview: loading, ...get()._updateTimestamp() };
        }),

      setLoadingProcessing: (loading) =>
        set((state) => {
          if (typeof loading !== "boolean") {
            console.warn("setLoadingProcessing: Must be a boolean.", loading);
            return state;
          }
          if (state.isLoadingProcessing === loading) return state;
          return { isLoadingProcessing: loading, ...get()._updateTimestamp() };
        }),

      setExtractingThumbnail: (loading) =>
        set((state) => {
          if (typeof loading !== "boolean") {
            console.warn("setExtractingThumbnail: Must be a boolean.", loading);
            return state;
          }
          if (state.isExtractingThumbnail === loading) return state;
          return { isExtractingThumbnail: loading, ...get()._updateTimestamp() };
        }),

      // --- Preview Data Actions ---
      setPreviewThumbnail: (thumbnailData) =>
        set((state) => {
          return {
            previewThumbnail: thumbnailData,
            ...get()._updateTimestamp(),
          };
        }),

      setPreviewMetadata: (metadata) =>
        set((state) => {
          return {
            previewMetadata: metadata,
            ...get()._updateTimestamp(),
          };
        }),

      // --- Clear Actions ---
      clearPreview: () =>
        set(() => ({
          hasVideo: false,
          url: "",
          uploadedFile: null,
          previewThumbnail: null,
          previewMetadata: null,
          isLoadingPreview: false,
          isLoadingProcessing: false,
          isExtractingThumbnail: false,
          ...get()._updateTimestamp(),
        })),

      // --- Thumbnail Cache Actions ---
      cacheThumbnail: (url, thumbnailData) =>
        set((state) => {
          const newCache = new Map(state.thumbnailCache);
          newCache.set(url, {
            thumbnail: thumbnailData,
            timestamp: Date.now()
          });
          return {
            thumbnailCache: newCache,
            ...get()._updateTimestamp(),
          };
        }),

      getCachedThumbnail: (url) => {
        const cached = get().thumbnailCache.get(url);
        if (cached && (Date.now() - cached.timestamp < 300000)) { // 5 minutes cache
          return cached.thumbnail;
        }
        return null;
      },

      // --- Project Management Actions ---
      addProject: (project) =>
        set((state) => {
          if (!project || typeof project !== "object") {
            console.warn("addProject: Invalid project provided.", project);
            return state;
          }

          const newProject = {
            ...project,
            id: project.id || Date.now(),
            createdAt: project.createdAt || new Date(),
            status: project.status || "processing",
            progress: project.progress || 0,
            expiresAt: project.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          };

          return {
            activeProjects: [...state.activeProjects, newProject],
            ...get()._updateTimestamp(),
          };
        }),

      updateProject: (projectId, updates) =>
        set((state) => {
          if (!projectId || typeof updates !== "object") {
            console.warn("updateProject: Invalid parameters.", { projectId, updates });
            return state;
          }

          const projectExists = state.activeProjects.some(p => p.id === projectId);
          if (!projectExists) {
            console.warn("updateProject: Project not found.", projectId);
            return state;
          }

          return {
            activeProjects: state.activeProjects.map(project =>
              project.id === projectId 
                ? { ...project, ...updates, lastUpdatedAt: new Date() }
                : project
            ),
            ...get()._updateTimestamp(),
          };
        }),

      removeProject: (projectId) =>
        set((state) => {
          if (!projectId) {
            console.warn("removeProject: Invalid projectId.", projectId);
            return state;
          }

          const initialLength = state.activeProjects.length;
          const updatedProjects = state.activeProjects.filter(project => project.id !== projectId);
          
          if (initialLength === updatedProjects.length) {
            return state; // No change if project not found
          }

          return {
            activeProjects: updatedProjects,
            selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
            ...get()._updateTimestamp(),
          };
        }),

      setSelectedProject: (projectId) =>
        set((state) => {
          if (state.selectedProjectId === projectId) return state;
          return {
            selectedProjectId: projectId,
            ...get()._updateTimestamp(),
          };
        }),

      // --- Utility Actions ---
      getCurrentInput: () => {
        const state = get();
        return state.uploadedFile || state.url;
      },

      isInputValid: () => {
        const state = get();
        return !!(state.uploadedFile || (state.url && state.url.trim()));
      },

      canStartProcessing: () => {
        const state = get();
        return state.hasVideo && 
               !state.isLoadingPreview && 
               !state.isLoadingProcessing &&
               state.isInputValid();
      },

      getProjectById: (projectId) => {
        const state = get();
        return state.activeProjects.find(project => project.id === projectId) || null;
      },

      getProcessingProjects: () => {
        const state = get();
        return state.activeProjects.filter(project => project.status === "processing");
      },

      getCompletedProjects: () => {
        const state = get();
        return state.activeProjects.filter(project => project.status === "completed");
      },

      getExpiredProjects: () => {
        const state = get();
        const now = new Date();
        return state.activeProjects.filter(project => 
          project.expiresAt && new Date(project.expiresAt) < now
        );
      },

      // --- Cleanup Actions ---
      removeExpiredProjects: () =>
        set((state) => {
          const now = new Date();
          const validProjects = state.activeProjects.filter(project => 
            !project.expiresAt || new Date(project.expiresAt) >= now
          );

          if (validProjects.length === state.activeProjects.length) {
            return state; // No expired projects found
          }

          console.log(`Removed ${state.activeProjects.length - validProjects.length} expired projects`);

          return {
            activeProjects: validProjects,
            selectedProjectId: validProjects.some(p => p.id === state.selectedProjectId) 
              ? state.selectedProjectId 
              : null,
            ...get()._updateTimestamp(),
          };
        }),

      clearAllProjects: () =>
        set(() => ({
          activeProjects: [],
          selectedProjectId: null,
          ...get()._updateTimestamp(),
        })),

      // --- Reset Action ---
      resetClipperStudio: () =>
        set(() => ({
          ...initialState,
          _version: CURRENT_SCHEMA_VERSION,
          lastUpdatedAt: new Date(),
        })),
    }),
    {
      name: "clipper-studio-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist project data and selected project
        activeProjects: state.activeProjects,
        selectedProjectId: state.selectedProjectId,
        // Persist clip gallery state to maintain view across refreshes
        showClipsGallery: state.showClipsGallery,
        currentProjectId: state.currentProjectId,
        _version: state._version,
        // Don't persist temporary UI states like loading, preview data, etc.
      }),
    }
  )
);

// Selectors (exported for convenience)
export const selectUrl = (state) => state.url;
export const selectUploadedFile = (state) => state.uploadedFile;
export const selectHasVideo = (state) => state.hasVideo;
export const selectShowClipsGallery = (state) => state.showClipsGallery;
export const selectCurrentProjectId = (state) => state.currentProjectId;
export const selectIsLoadingPreview = (state) => state.isLoadingPreview;
export const selectIsLoadingProcessing = (state) => state.isLoadingProcessing;
export const selectIsExtractingThumbnail = (state) => state.isExtractingThumbnail;
export const selectPreviewThumbnail = (state) => state.previewThumbnail;
export const selectPreviewMetadata = (state) => state.previewMetadata;
export const selectActiveProjects = (state) => state.activeProjects;
export const selectSelectedProjectId = (state) => state.selectedProjectId;
export const selectLastUpdatedAt = (state) => state.lastUpdatedAt;
export const selectSchemaVersion = (state) => state._version;