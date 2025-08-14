import { useState, useCallback } from "react";
import {
  uploadFile,
  uploadMultipleFiles,
  uploadPostMedia,
  uploadProfilePicture,
  uploadClipperThumbnail,
  deleteFile,
  deleteMultipleFiles,
} from "../lib/storage/firebase";

/**
 * Custom hook for Firebase Storage operations
 * @returns {Object} Firebase storage functions and state
 */
const useFirebaseStorage = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadResults, setUploadResults] = useState([]);

  /**
   * Reset the upload state
   */
  const resetUploadState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
    setUploadResults([]);
  }, []);

  /**
   * Upload a single file to Firebase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - Storage folder path
   * @param {string} customFileName - Optional custom file name
   * @returns {Promise<object>} Upload result object
   */
  const handleUploadFile = useCallback(
    async (file, folder, customFileName = null) => {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        // Add progress tracking through a custom event listener
        // This would require modification to the firebase.js file to support this

        const result = await uploadFile(file, folder, customFileName);
        setUploadResults([result]);
        setUploadProgress(100);
        return result;
      } catch (err) {
        setError(err.message || "Error uploading file");
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * Upload multiple files to Firebase Storage
   * @param {Array<File>} files - Array of files to upload
   * @param {string} folder - Storage folder path
   * @returns {Promise<Array<object>>} Array of upload result objects
   */
  const handleUploadMultipleFiles = useCallback(async (files, folder) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const results = await uploadMultipleFiles(files, folder);
      setUploadResults(results);
      setUploadProgress(100);
      return results;
    } catch (err) {
      setError(err.message || "Error uploading multiple files");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Upload post media files
   * @param {Array<File>} mediaFiles - Array of media files
   * @param {string} postId - Optional post ID
   * @returns {Promise<Array<object>>} Array of upload result objects
   */
  const handleUploadPostMedia = useCallback(
    async (mediaFiles, postId = null) => {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        const results = await uploadPostMedia(mediaFiles, postId);
        setUploadResults(results);
        setUploadProgress(100);
        return results;
      } catch (err) {
        setError(err.message || "Error uploading post media");
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * Upload a profile picture
   * @param {File} file - Image file
   * @param {string} userId - User ID
   * @returns {Promise<object>} Upload result object
   */
  const handleUploadProfilePicture = useCallback(async (file, userId) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const result = await uploadProfilePicture(file, userId);
      setUploadResults([result]);
      setUploadProgress(100);
      return result;
    } catch (err) {
      setError(err.message || "Error uploading profile picture");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Delete a file from Firebase Storage
   * @param {string} path - Storage path of the file to delete
   * @returns {Promise<object>} Result of deletion operation
   */
  const handleDeleteFile = useCallback(async (path) => {
    try {
      setError(null);
      return await deleteFile(path);
    } catch (err) {
      setError(err.message || "Error deleting file");
      throw err;
    }
  }, []);

  /**
   * Upload clipper studio thumbnail
   * @param {File} file - Thumbnail image file
   * @param {string} projectId - Project ID
   * @returns {Promise<object>} Upload result object
   */
  const handleUploadClipperThumbnail = useCallback(async (file, projectId) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const result = await uploadClipperThumbnail(file, projectId);
      setUploadResults([result]);
      setUploadProgress(100);
      return result;
    } catch (err) {
      setError(err.message || "Error uploading clipper thumbnail");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Delete multiple files from Firebase Storage
   * @param {Array<string>} paths - Array of file paths to delete
   * @returns {Promise<object>} Result of deletion operation
   */
  const handleDeleteMultipleFiles = useCallback(async (paths) => {
    try {
      setError(null);
      return await deleteMultipleFiles(paths);
    } catch (err) {
      setError(err.message || "Error deleting multiple files");
      throw err;
    }
  }, []);

  return {
    // State
    isUploading,
    uploadProgress,
    error,
    uploadResults,

    // Functions
    uploadFile: handleUploadFile,
    uploadMultipleFiles: handleUploadMultipleFiles,
    uploadPostMedia: handleUploadPostMedia,
    uploadProfilePicture: handleUploadProfilePicture,
    uploadClipperThumbnail: handleUploadClipperThumbnail,
    deleteFile: handleDeleteFile,
    deleteMultipleFiles: handleDeleteMultipleFiles,
    resetUploadState,
  };
};

export default useFirebaseStorage;
