// Import the storage utility functions
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./firebase-config";

/**
 * Upload file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} folder - Storage folder path (e.g., 'posts', 'profiles')
 * @param {string} customFileName - Optional custom file name
 * @returns {Promise<object>} - Object containing download URL and storage path
 */
export const uploadFile = async (file, folder, customFileName = null) => {
  try {
    // Generate UUID for the file
    const uuid = uuidv4();

    // Get file extension
    const fileExtension = file.name.split(".").pop();

    // Create filename - if customFileName is provided, use UUID_customFileName.ext pattern
    const fileName = customFileName
      ? `${uuid}_${customFileName}.${fileExtension}`
      : `${uuid}.${fileExtension}`;

    // Set the storage path - organize by folder and file type
    // Check if folder already includes the file type to avoid paths like "posts/video/video"
    const fileType = file.type.split("/")[0]; // 'image', 'video', etc.
    const storagePath = folder.includes(fileType)
      ? `${folder}/${fileName}`
      : `${folder}/${fileType}/${fileName}`;

    // Create a storage reference
    const storageRef = ref(storage, storagePath);

    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return a promise that resolves with the download URL when upload completes
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Optional: Track upload progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          // Handle upload errors
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: storagePath,
            size: file.size,
            type: file.type,
            name: fileName,
            originalName: file.name,
            uuid: uuid,
          });
        }
      );
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Upload multiple files to Firebase Storage
 * @param {Array<File>} files - Array of files to upload
 * @param {string} folder - Storage folder path
 * @returns {Promise<Array<object>>} - Array of objects with download URLs and paths
 */
export const uploadMultipleFiles = async (files, folder) => {
  try {
    const uploadPromises = Array.from(files).map((file) =>
      uploadFile(file, folder)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    throw error;
  }
};

/**
 * Upload post media files to appropriate folders
 * @param {Array<File>} mediaFiles - Array of media files
 * @param {string} postId - Unique post identifier (optional) - Not used in simplified structure
 * @returns {Promise<Array<object>>} - Array of media file metadata
 */
export const uploadPostMedia = async (mediaFiles, postId = null) => {
  try {
    // Use a simple 'posts' folder without creating unique subfolders
    const folder = "posts";

    const uploadedFiles = await uploadMultipleFiles(mediaFiles, folder);
    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading post media:", error);
    throw error;
  }
};

/**
 * Upload video thumbnail
 * @param {File} thumbnailFile - The thumbnail image file
 * @param {string} videoId - ID of the video this thumbnail belongs to
 * @returns {Promise<object>} - Thumbnail metadata including download URL
 */
export const uploadVideoThumbnail = async (thumbnailFile, videoId) => {
  try {
    // Validate that it's an image
    if (!thumbnailFile.type.startsWith("image/")) {
      throw new Error("Thumbnail must be an image file");
    }

    // Use path: posts/video/thumbnail/{videoId}
    const folder = `posts/video/thumbnail`;

    // Use videoId as part of filename for easy reference
    const customFileName = `thumb_${videoId}`;

    return await uploadFile(thumbnailFile, folder, customFileName);
  } catch (error) {
    console.error("Error uploading video thumbnail:", error);
    throw error;
  }
};

/**
 * Upload profile picture
 * @param {File} file - Image file
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Image metadata
 */
export const uploadProfilePicture = async (file, userId) => {
  try {
    // Validate that it's an image
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Generate UUID for the file
    const uuid = uuidv4();
    const fileExtension = file.name.split(".").pop();
    const fileName = `profile_${userId}_${uuid}.${fileExtension}`;

    // Create storage path directly without auto-adding file type subfolder
    const storagePath = `profileImage/${fileName}`;

    // Create a storage reference
    const storageRef = ref(storage, storagePath);

    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return a promise that resolves with the download URL when upload completes
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Optional: Track upload progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          // Handle upload errors
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: storagePath,
            size: file.size,
            type: file.type,
            name: fileName,
            originalName: file.name,
            uuid: uuid,
          });
        }
      );
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Storage path of the file to delete
 * @returns {Promise<void>}
 */
export const deleteFile = async (path) => {
  try {
    console.log("🗑️ Deleting file at path:", path);
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    console.log("✅ File deleted successfully:", path);
    return { success: true, message: "File deleted successfully" };
  } catch (error) {
    console.error("❌ Error deleting file:", path, error);
    throw error;
  }
};

/**
 * Delete multiple files from Firebase Storage
 * @param {Array<string>} paths - Array of file paths to delete
 * @returns {Promise<object>} - Result of deletion operation
 */
export const deleteMultipleFiles = async (paths) => {
  try {
    console.log("🔥 deleteMultipleFiles called with paths:", paths);
    const deletePromises = paths.map((path) => {
      console.log("🔥 Creating delete promise for path:", path);
      return deleteFile(path);
    });
    console.log("🔥 Waiting for all deletions to complete...");
    await Promise.all(deletePromises);
    console.log("✅ All files deleted successfully");
    return { success: true, message: "All files deleted successfully" };
  } catch (error) {
    console.error("❌ Error deleting multiple files:", error);
    throw error;
  }
};
