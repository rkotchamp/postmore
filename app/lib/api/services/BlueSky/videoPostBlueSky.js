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
    console.log(
      `BlueSky: Archiving video to Firebase: ${mediaItem.originalName}`
    );

    // Create a File object from the ArrayBuffer
    const videoFile = new File(
      [videoBytes],
      mediaItem.originalName || `bluesky-video-${Date.now()}.mp4`,
      { type: mediaType || "video/mp4" }
    );

    // Upload to Firebase
    const result = await uploadFile(videoFile, "posts/videos");
    console.log(`BlueSky: Successfully archived to Firebase:`, result.url);
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
 * @returns {Promise<object>} Result of the upload operation
 */
const uploadVideo = async (agent, videoUrl, mediaItem) => {
  console.log(
    `BlueSky: Uploading video ${mediaItem.originalName}, type: ${
      mediaItem.type || "unknown"
    }`
  );

  try {
    // 1. First check upload limits to see if the user can upload video
    console.log(
      `BlueSky: Checking video upload limits for ${mediaItem.originalName}`
    );

    // Skip the getUploadLimits call which is causing XRPCNotSupported error
    // Try to proceed directly with the upload instead
    let canUpload = true;
    try {
      // Only try this API call if it exists, otherwise skip it
      if (typeof agent.api.app.bsky.video.getUploadLimits === "function") {
        const limitsResponse = await agent.api.app.bsky.video.getUploadLimits();
        console.log(`BlueSky: Upload limits response:`, {
          canUpload: limitsResponse.data.canUpload,
          remainingVideos: limitsResponse.data.remainingDailyVideos,
          remainingBytes: limitsResponse.data.remainingDailyBytes,
          message: limitsResponse.data.message || "N/A",
        });
        canUpload = limitsResponse.data.canUpload;
      } else {
        console.log(
          `BlueSky: API does not support getUploadLimits, proceeding anyway`
        );
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
    console.log(
      `BlueSky: Fetching video file from URL: ${
        videoUrl
          ? videoUrl.substring(0, 60) + "..."
          : "No URL, using file directly"
      }`
    );

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
            console.log(`BlueSky: Using provided file object instead of URL`);
            videoBytes = await mediaItem.file.arrayBuffer();
            console.log(
              `BlueSky: Successfully read ${videoBytes.byteLength} bytes from file object`
            );
          } else {
            throw new Error(
              `Fetch failed: ${response.status} - ${response.statusText}`
            );
          }
        } else {
          const contentType = response.headers.get("content-type");
          console.log(
            `BlueSky: Video content-type from server: ${contentType}`
          );

          // Save content-type for later use
          mediaItem.serverContentType = contentType;

          videoBytes = await response.arrayBuffer();
          console.log(
            `BlueSky: Fetched ${videoBytes.byteLength} bytes for video ${mediaItem.originalName}`
          );
        }
      }
      // If no URL but we have a file, use it directly
      else if (mediaItem.file) {
        console.log(`BlueSky: No URL provided, using file object directly`);
        videoBytes = await mediaItem.file.arrayBuffer();
        console.log(
          `BlueSky: Successfully read ${videoBytes.byteLength} bytes from file object`
        );
      } else {
        throw new Error("No video URL or file object provided");
      }
    } catch (fetchError) {
      console.error(`BlueSky: Error fetching video: ${fetchError.message}`);

      // Try using direct file as fallback if we have it
      if (mediaItem.file) {
        try {
          console.log(
            `BlueSky: Attempting to use file object directly as fallback`
          );
          videoBytes = await mediaItem.file.arrayBuffer();
          console.log(
            `BlueSky: Successfully read ${videoBytes.byteLength} bytes from file object`
          );
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
    console.log(`BlueSky: Using final media type: ${finalMediaType}`);

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
    console.log(
      `BlueSky: Starting video upload of ${videoBytes.byteLength} bytes directly to BlueSky`
    );

    // Create a blob from the array buffer
    const blob = new Uint8Array(videoBytes);

    // Upload the video using the app.bsky.video.uploadVideo endpoint
    console.log(
      `BlueSky: Starting video upload API call with ${videoBytes.byteLength} bytes, type: ${finalMediaType}`
    );

    try {
      // This is a direct upload to BlueSky - not going through Firebase first
      console.log(`BlueSky: Directly uploading to BlueSky's video API`);

      // Instead of using agent.api.app.bsky.video.uploadVideo, which may not be supported,
      // we'll use the raw XRPC call which maps directly to the documented endpoint
      console.log(
        `BlueSky: Using direct XRPC call to upload ${videoBytes.byteLength} bytes, type: ${finalMediaType}`
      );

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
          console.log(
            `BlueSky: Converting MIME type from ${uploadMimeType} to video/mp4 for better compatibility`
          );
          uploadMimeType = "video/mp4";
        }

        // Use the agent's XRPC client to call the endpoint directly
        console.log(
          `BlueSky: Uploading blob with MIME type: ${uploadMimeType}`
        );
        uploadResponse = await agent.api.com.atproto.repo.uploadBlob(blob, {
          encoding: uploadMimeType,
        });

        console.log("BlueSky: Upload blob successful:", {
          success: !!uploadResponse,
          hasBlob: !!uploadResponse?.data?.blob,
          blobRef: uploadResponse?.data?.blob?.ref || "missing",
          blobSize: uploadResponse?.data?.blob?.size || 0,
          blobType: uploadResponse?.data?.blob?.mimeType || "unknown",
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
  console.log(`BlueSky: Polling for video job status: ${jobId}`);

  const startTime = Date.now();

  // Poll with increasing intervals
  const intervals = [1000, 2000, 3000, 5000, 10000]; // 1s, 2s, 3s, 5s, then 10s
  let intervalIndex = 0;

  while (Date.now() - startTime < timeoutMs) {
    try {
      console.log(
        `BlueSky: Checking job status for job ${jobId}, poll #${
          intervalIndex + 1
        }`
      );
      const response = await agent.api.app.bsky.video.getJobStatus({ jobId });

      if (!response || !response.data || !response.data.jobStatus) {
        console.error(
          `BlueSky: Invalid response from getJobStatus for job ${jobId}:`,
          response
        );
        throw new Error("Invalid response from video job status check");
      }

      const jobStatus = response.data.jobStatus;

      console.log(
        `BlueSky: Video job status: ${jobStatus.state}, progress: ${
          jobStatus.progress || 0
        }%, hasBlob: ${!!jobStatus.blob}`
      );

      // Check if processing is complete
      if (jobStatus.state === "JOB_STATE_COMPLETED" && jobStatus.blob) {
        console.log(
          `BlueSky: Video processing completed successfully for job ${jobId}`
        );
        console.log(`BlueSky: Blob details:`, {
          hasRef: !!jobStatus.blob.ref,
          link: jobStatus.blob.ref?.$link || "none",
          size: jobStatus.blob.size || "unknown",
          mimeType: jobStatus.blob.mimeType || "unknown",
        });
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
    console.log(
      `BlueSky: Retrying Firebase upload for video: ${
        metadata.originalName || "unknown"
      }`
    );

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
    console.log(`BlueSky: Retry upload to Firebase successful:`, result);
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
