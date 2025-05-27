/**
 * Bluesky Video Upload Utilities
 * Handles video upload, processing, and status checking for Bluesky posts
 *
 * FLOW:
 * 1. Videos are uploaded directly to BlueSky first
 * 2. After successful upload to BlueSky, we archive the video to Firebase
 * 3. Return both BlueSky-specific information and Firebase URL for records
 */

// Import Firebase storage utilities
import { uploadFile } from "@/app/lib/storage/firebase";

// Constants for video handling
const MAX_VIDEO_SIZE_BYTES = 100000000; // 100MB
const VIDEO_PROCESSING_TIMEOUT_MS = 300000; // 5 minutes timeout
const ALLOWED_VIDEO_FORMATS = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/mpeg",
  "video/mpg",
  "video/m4v",
];

/**
 * Archives a video to Firebase storage after uploading to BlueSky
 * @param {ArrayBuffer} videoBytes - The video data as ArrayBuffer
 * @param {object} mediaItem - Metadata about the video
 * @param {string} mediaType - Content type of the video
 * @returns {Promise<object>} Result of the Firebase upload
 */
const archiveToFirebase = async (videoBytes, mediaItem, mediaType) => {
  try {
    // If the media item already has a Firebase URL from the dashboard upload, use it
    if (mediaItem.url) {
      return {
        success: true,
        url: mediaItem.url,
        type: mediaItem.type || mediaType,
        size: mediaItem.size || (videoBytes ? videoBytes.byteLength : 0),
        originalName: mediaItem.originalName,
      };
    }

    // Original upload code as fallback (should rarely get here)

    // Create a File object from the ArrayBuffer
    const videoFile = new File(
      [videoBytes],
      mediaItem.originalName || `bluesky-video-${Date.now()}.mp4`,
      { type: mediaType || "video/mp4" }
    );

    // Upload to Firebase
    const result = await uploadFile(videoFile, "posts/videos");

    return result;
  } catch (error) {
    console.error(`BlueSky: Firebase archiving failed: ${error.message}`);
    // Return a partial result with the error - don't fail the BlueSky post just because Firebase archiving failed
    return {
      success: false,
      error: error.message,
      url: null, // No URL available
      // Include enough info to retry the upload later if needed
      retry: {
        name: mediaItem.originalName || `bluesky-video-${Date.now()}.mp4`,
        type: mediaType || "video/mp4",
      },
    };
  }
};

/**
 * Upload a video to Bluesky
 * @param {BskyAgent} agent - Authenticated Bluesky agent
 * @param {string} videoUrl - URL to the video file
 * @param {object} mediaItem - Metadata about the video
 * @param {File|null} thumbnail - Thumbnail image for the video
 * @returns {Promise<object>} Result of the upload operation
 */
const uploadVideo = async (agent, videoUrl, mediaItem, thumbnail = null) => {
  let thumbBlob = null;

  try {
    // First, if we have a thumbnail, upload it separately before doing anything else
    if (thumbnail instanceof File && thumbnail.type.startsWith("image/")) {
      try {
        const thumbResponse = await fetch(URL.createObjectURL(thumbnail));
        const thumbBytes = await thumbResponse.arrayBuffer();

        // Upload the thumbnail with explicit image/jpeg type
        const thumbUploadResult = await agent.uploadBlob(
          new Uint8Array(thumbBytes),
          { encoding: thumbnail.type || "image/jpeg" }
        );

        if (thumbUploadResult.success) {
          // Save the thumbnail blob for later use
          thumbBlob = thumbUploadResult.data.blob;
          // Ensure proper blob structure and force image MIME type
          thumbBlob = {
            $type: "blob",
            ref: thumbBlob.ref,
            mimeType: "image/jpeg", // Force image MIME type for thumb
            size: thumbBlob.size,
          };
        } else {
          console.error(`BlueSky: Thumbnail upload failed`);
        }
      } catch (thumbError) {
        console.error(
          `BlueSky: Error uploading thumbnail: ${thumbError.message}`
        );
        // Continue with video upload even if thumbnail fails
      }
    } else if (thumbnail) {
    }

    // 1. First check upload limits to see if the user can upload video

    // Skip the getUploadLimits call which is causing XRPCNotSupported error
    // Try to proceed directly with the upload instead
    let canUpload = true;
    try {
      // Only try this API call if it exists, otherwise skip it
      if (typeof agent.api.app.bsky.video.getUploadLimits === "function") {
        const limitsResponse = await agent.api.app.bsky.video.getUploadLimits();

        canUpload = limitsResponse.data.canUpload;
      } else {
      }
    } catch (limitsError) {
      console.warn(
        `BlueSky: Could not check upload limits, proceeding anyway:`,
        limitsError.message
      );
      // Continue with upload attempt even if the limits check fails
    }

    if (!canUpload) {
      console.error("BlueSky: User has reached video upload limits");
      return {
        success: false,
        error: "You've reached your video upload limits",
      };
    }

    // 2. Fetch the video file from the URL

    let videoBytes;

    try {
      // Check if we have a URL to fetch
      if (videoUrl) {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          console.error(
            `BlueSky: Failed to fetch video from URL, status: ${response.status}, statusText: ${response.statusText}`
          );

          // If we couldn't get the video from URL, check if we have a direct file object
          if (mediaItem.file) {
            videoBytes = await mediaItem.file.arrayBuffer();
          } else {
            throw new Error(
              `Fetch failed: ${response.status} - ${response.statusText}`
            );
          }
        } else {
          const contentType = response.headers.get("content-type");

          // Save content-type for later use
          mediaItem.serverContentType = contentType;

          videoBytes = await response.arrayBuffer();
        }
      }
      // If no URL but we have a file, use it directly
      else if (mediaItem.file) {
        console.log(`BlueSky: No URL provided, using file object directly`);
        videoBytes = await mediaItem.file.arrayBuffer();
      } else {
        throw new Error("No video URL or file object provided");
      }
    } catch (fetchError) {
      console.error(`BlueSky: Error fetching video: ${fetchError.message}`);

      // Try using direct file as fallback if we have it
      if (mediaItem.file) {
        try {
          videoBytes = await mediaItem.file.arrayBuffer();
        } catch (fileError) {
          console.error(
            `BlueSky: Failed to read file object: ${fileError.message}`
          );
          throw new Error(
            `Could not fetch video from URL or file: ${fetchError.message}`
          );
        }
      } else {
        throw fetchError; // Re-throw if we don't have a file to fall back on
      }
    }

    // Use content-type from mediaItem, file, or server response
    const finalMediaType =
      mediaItem.type ||
      (mediaItem.file && mediaItem.file.type) ||
      mediaItem.serverContentType ||
      "video/mp4";

    // 3. Validate video size
    if (videoBytes.byteLength > MAX_VIDEO_SIZE_BYTES) {
      console.error(
        `BlueSky: Video exceeds size limit (${videoBytes.byteLength} > ${MAX_VIDEO_SIZE_BYTES})`
      );
      return {
        success: false,
        error: `Video exceeds Bluesky's ${
          MAX_VIDEO_SIZE_BYTES / 1000000
        }MB size limit`,
      };
    }

    // 4. Upload the video using the video upload endpoint

    // Create a blob from the array buffer
    const blob = new Uint8Array(videoBytes);

    // Upload the video using the app.bsky.video.uploadVideo endpoint

    try {
      // This is a direct upload to BlueSky - not going through Firebase first

      // Instead of using agent.api.app.bsky.video.uploadVideo, which may not be supported,
      // we'll use the raw XRPC call which maps directly to the documented endpoint

      let uploadResponse;
      try {
        // Ensure the MIME type is one that BlueSky will recognize
        // BlueSky prefers MP4 videos, but can handle some other formats
        let uploadMimeType = finalMediaType;

        // If it's a QuickTime .mov file, tell BlueSky it's a video/mp4 as that's more widely supported
        if (
          uploadMimeType === "video/quicktime" ||
          uploadMimeType.includes("mov")
        ) {
          uploadMimeType = "video/mp4";
        }

        // Use the agent's XRPC client to call the endpoint directly

        uploadResponse = await agent.api.com.atproto.repo.uploadBlob(blob, {
          encoding: uploadMimeType,
        });

        // Archive to Firebase as well for database consistency
        const firebaseResult = await archiveToFirebase(
          videoBytes,
          mediaItem,
          finalMediaType
        );

        // Make sure the blob data is in the expected format
        if (!uploadResponse.data.blob || !uploadResponse.data.blob.ref) {
          throw new Error("Missing blob reference in upload response");
        }

        return {
          success: true,
          blob: uploadResponse.data.blob,
          thumbBlob,
          firebase: firebaseResult,
          originalSize: videoBytes.byteLength,
          mimeType: uploadMimeType, // Return the MIME type we used for the upload
        };
      } catch (uploadXrpcError) {
        console.error("BlueSky: Direct blob upload error:", uploadXrpcError);
        throw new Error(
          `Video upload to BlueSky failed: ${uploadXrpcError.message}`
        );
      }
    } catch (uploadApiError) {
      console.error("BlueSky: Video upload API error:", uploadApiError);
      console.error("BlueSky: Error details:", {
        message: uploadApiError.message,
        status: uploadApiError.status,
        error: uploadApiError.error,
      });
      throw new Error(
        `Video upload to BlueSky failed: ${uploadApiError.message}`
      );
    }
  } catch (error) {
    console.error(
      `BlueSky: Video upload error for ${mediaItem.originalName}:`,
      error
    );
    return {
      success: false,
      error: error.message || "Unknown error during video upload",
    };
  }
};

/**
 * Poll for video processing job status
 * @param {BskyAgent} agent - Authenticated Bluesky agent
 * @param {string} jobId - ID of the video processing job
 * @param {number} timeoutMs - Maximum time to wait for processing
 * @returns {Promise<object|null>} The processed video blob or null if timeout/error
 */
const pollVideoJobStatus = async (
  agent,
  jobId,
  timeoutMs = VIDEO_PROCESSING_TIMEOUT_MS
) => {
  const startTime = Date.now();

  // Poll with increasing intervals
  const intervals = [1000, 2000, 3000, 5000, 10000]; // 1s, 2s, 3s, 5s, then 10s
  let intervalIndex = 0;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await agent.api.app.bsky.video.getJobStatus({ jobId });

      if (!response || !response.data || !response.data.jobStatus) {
        console.error(
          `BlueSky: Invalid response from getJobStatus for job ${jobId}:`,
          response
        );
        throw new Error("Invalid response from video job status check");
      }

      const jobStatus = response.data.jobStatus;

      // Check if processing is complete
      if (jobStatus.state === "JOB_STATE_COMPLETED" && jobStatus.blob) {
        console.log(
          `BlueSky: Video processing completed successfully for job ${jobId}`
        );

        return jobStatus.blob;
      }

      // Check if processing failed
      if (jobStatus.state === "JOB_STATE_FAILED") {
        console.error(
          `BlueSky: Video processing failed: ${
            jobStatus.error || "Unknown error"
          }`
        );
        throw new Error(jobStatus.error || "Video processing failed");
      }

      // Wait before polling again
      const interval = intervals[Math.min(intervalIndex, intervals.length - 1)];
      intervalIndex++;

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error(
        `BlueSky: Error checking video job status: ${error.message}`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.error(
    `BlueSky: Video processing timed out after ${timeoutMs / 1000} seconds`
  );
  return null;
};

/**
 * Retry uploading a video to Firebase after BlueSky success
 * This can be called by a background job if the initial Firebase upload fails
 * @param {File|Blob|ArrayBuffer} videoData - The video data
 * @param {object} metadata - Video metadata
 * @returns {Promise<object>} Firebase upload result
 */
const retryFirebaseUpload = async (videoData, metadata) => {
  try {
    // Create a File object if needed
    let videoFile = videoData;
    if (!(videoData instanceof File)) {
      videoFile = new File(
        [videoData],
        metadata.originalName || `retry-video-${Date.now()}.mp4`,
        { type: metadata.type || "video/mp4" }
      );
    }

    const result = await uploadFile(videoFile, "posts/videos");

    return result;
  } catch (error) {
    console.error(`BlueSky: Retry upload to Firebase failed:`, error);
    throw error;
  }
};

export {
  uploadVideo,
  pollVideoJobStatus,
  retryFirebaseUpload,
  archiveToFirebase,
  ALLOWED_VIDEO_FORMATS,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_PROCESSING_TIMEOUT_MS,
};
