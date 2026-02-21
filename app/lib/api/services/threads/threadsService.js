/**
 * Threads API Service
 * Handles content publishing via the Threads Content Publishing API
 * API docs: https://developers.facebook.com/docs/threads/posts
 */

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

/**
 * Creates a Threads media container (step 1 of 2)
 *
 * @param {string} userId - Threads platform user ID
 * @param {string} accessToken
 * @param {Object} params - media_type, text, image_url, video_url, children, is_carousel_item
 * @returns {Promise<string>} container ID
 */
async function createThreadsContainer(userId, accessToken, params) {
  const url = new URL(`${THREADS_API_BASE}/${userId}/threads`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), { method: "POST" });
  const data = await response.json();

  if (!response.ok || data.error || !data.id) {
    const msg = data.error?.message || data.error_description || "Failed to create Threads container";
    throw new Error(msg);
  }

  return data.id;
}

/**
 * Publishes a Threads container (step 2 of 2)
 *
 * @param {string} userId
 * @param {string} accessToken
 * @param {string} creationId - container ID from step 1
 * @returns {Promise<string>} published post ID
 */
async function publishThreadsContainer(userId, accessToken, creationId) {
  const url = new URL(`${THREADS_API_BASE}/${userId}/threads_publish`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("creation_id", creationId);

  const response = await fetch(url.toString(), { method: "POST" });
  const data = await response.json();

  if (!response.ok || data.error || !data.id) {
    const msg = data.error?.message || data.error_description || "Failed to publish Threads container";
    throw new Error(msg);
  }

  return data.id;
}

/**
 * Polls a container until its STATUS field is FINISHED (or FAILED).
 * Needed for video uploads that require server-side processing.
 *
 * @param {string} userId
 * @param {string} accessToken
 * @param {string} containerId
 * @param {number} timeoutMs - max wait time (default 60s)
 */
async function waitForContainerReady(userId, accessToken, containerId, timeoutMs = 60000) {
  const pollInterval = 3000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const url = `${THREADS_API_BASE}/${containerId}?fields=status,error_message&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Error polling Threads container status");
    }

    const status = data.status?.toUpperCase();
    if (status === "FINISHED") return;
    if (status === "FAILED") {
      throw new Error(data.error_message || "Threads video container processing failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Timed out waiting for Threads video container to be ready");
}

/**
 * Determines the media type(s) from a mediaFiles array
 */
function getMediaType(mediaFiles) {
  if (!mediaFiles || mediaFiles.length === 0) return "TEXT";
  if (mediaFiles.length > 1) return "CAROUSEL";
  const item = mediaFiles[0];
  const mimeType = item.type || item.mimeType || "";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "IMAGE";
}

/**
 * Main post function — called by apiManager
 *
 * @param {Object} accountData - { platformAccountId, accessToken }
 * @param {Object} postData - { textContent, text, mediaFiles }
 * @returns {Promise<Object>} { success, postId, url }
 */
async function post(accountData, postData) {
  const { platformAccountId, accessToken } = accountData;

  if (!accessToken) throw new Error("Missing accessToken for Threads account");
  if (!platformAccountId) throw new Error("Missing platformAccountId for Threads account");

  const text = postData.textContent || postData.text || "";
  const mediaFiles = postData.mediaFiles || [];
  const mediaType = getMediaType(mediaFiles);

  console.log(`🧵 ThreadsService: Posting as ${mediaType}, userId=${platformAccountId}`);

  let creationId;

  if (mediaType === "TEXT") {
    creationId = await createThreadsContainer(platformAccountId, accessToken, {
      media_type: "TEXT",
      text,
    });

  } else if (mediaType === "IMAGE") {
    const item = mediaFiles[0];
    if (!item.url) throw new Error("Threads image post requires a public URL");
    creationId = await createThreadsContainer(platformAccountId, accessToken, {
      media_type: "IMAGE",
      image_url: item.url,
      text,
    });

  } else if (mediaType === "VIDEO") {
    const item = mediaFiles[0];
    if (!item.url) throw new Error("Threads video post requires a public URL");
    creationId = await createThreadsContainer(platformAccountId, accessToken, {
      media_type: "VIDEO",
      video_url: item.url,
      text,
    });
    // Videos need processing time before publish
    await waitForContainerReady(platformAccountId, accessToken, creationId);

  } else if (mediaType === "CAROUSEL") {
    // Step A: create individual item containers
    const itemIds = [];
    for (const item of mediaFiles) {
      if (!item.url) {
        console.warn("🧵 ThreadsService: Skipping carousel item with no URL");
        continue;
      }
      const mimeType = item.type || item.mimeType || "";
      const isVideo = mimeType.startsWith("video/");
      const params = {
        media_type: isVideo ? "VIDEO" : "IMAGE",
        is_carousel_item: "true",
      };
      if (isVideo) {
        params.video_url = item.url;
      } else {
        params.image_url = item.url;
      }
      const itemId = await createThreadsContainer(platformAccountId, accessToken, params);
      if (isVideo) {
        await waitForContainerReady(platformAccountId, accessToken, itemId);
      }
      itemIds.push(itemId);
    }

    if (itemIds.length === 0) throw new Error("No valid carousel items for Threads post");

    // Step B: create carousel container
    creationId = await createThreadsContainer(platformAccountId, accessToken, {
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      text,
    });
  }

  // Publish
  const publishedId = await publishThreadsContainer(platformAccountId, accessToken, creationId);

  const postUrl = `https://www.threads.net/@${accountData.platformUsername || ""}`;

  console.log(`✅ ThreadsService: Published post ${publishedId}`);

  return {
    success: true,
    postId: publishedId,
    url: postUrl,
    platform: "threads",
  };
}

const threadsService = { post };
export default threadsService;
