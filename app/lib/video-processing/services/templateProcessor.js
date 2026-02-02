/**
 * Template Processor Service
 * Handles video template rendering and processing for sharing
 * Cloned from download-video-with-template route to avoid API-to-API calls
 */

import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { burnSubtitlesIntoVideo } from "./captionService";

/**
 * Process video with template overlay and captions
 * Main function that coordinates the entire video processing pipeline
 *
 * @param {string} videoUrl - URL of the source video
 * @param {Object} templateData - Template configuration
 * @param {Object} captionData - Caption data with timestamps
 * @param {Object} captionSettings - Caption styling settings
 * @returns {Promise<string>} Path to the processed video file
 */
export async function processVideoWithTemplate(videoUrl, templateData, captionData, captionSettings) {
  console.log(`🎬 [TEMPLATE-PROCESSOR] Starting video processing...`);
  console.log(`🎨 [TEMPLATE-PROCESSOR] Template: ${templateData?.template}`);
  console.log(`📝 [TEMPLATE-PROCESSOR] Has captions: ${!!captionData}`);

  // Download the source video
  console.log(`📥 [TEMPLATE-PROCESSOR] Downloading source video from: ${videoUrl}`);
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status}`);
  }

  // Setup temporary file paths
  const tempDir = "/tmp";
  const timestamp = Date.now();
  const inputVideoPath = path.join(tempDir, `input_${timestamp}.mp4`);
  const overlayImagePath = path.join(tempDir, `overlay_${timestamp}.png`);
  const outputVideoPath = path.join(tempDir, `output_${timestamp}.mp4`);

  try {
    // Save input video to temp file
    const inputVideoBuffer = await videoResponse.arrayBuffer();
    await fs.writeFile(inputVideoPath, new Uint8Array(inputVideoBuffer));
    console.log(`💾 [TEMPLATE-PROCESSOR] Saved input video: ${inputVideoPath}`);

    // Check template type
    const isBlankTemplate = templateData?.template === "default" || templateData?.template === "blank";
    const isBWTemplate = templateData?.template === "bw-frame" ||
                         templateData?.template === "black-and-white" ||
                         templateData?.template === "bw";

    // Render template overlay (skip for blank templates)
    let overlayBuffer;
    if (!isBlankTemplate && templateData) {
      console.log(`🎨 [TEMPLATE-PROCESSOR] Rendering HTML template to PNG...`);
      overlayBuffer = await renderTemplateToImage(templateData);
      await fs.writeFile(overlayImagePath, overlayBuffer);
      console.log(`✅ [TEMPLATE-PROCESSOR] Template rendered successfully`);
    } else {
      console.log(`⏭️ [TEMPLATE-PROCESSOR] Skipping template rendering (blank template)`);
    }

    // Apply template overlay with FFmpeg
    console.log(`🎬 [TEMPLATE-PROCESSOR] Processing video with FFmpeg...`);
    await overlayImageOnVideo(inputVideoPath, overlayImagePath, outputVideoPath, templateData || {});
    console.log(`✅ [TEMPLATE-PROCESSOR] Video processing completed`);

    // Burn captions if provided
    let finalVideoPath = outputVideoPath;
    if (captionData && captionSettings) {
      console.log(`🔥 [TEMPLATE-PROCESSOR] Burning captions into video...`);
      const captionBurnPath = path.join(tempDir, `caption_burned_${timestamp}.mp4`);

      try {
        await burnSubtitlesIntoVideo(
          outputVideoPath,
          captionData,
          captionSettings,
          captionBurnPath,
          { tempDir }
        );
        finalVideoPath = captionBurnPath;
        console.log(`✅ [TEMPLATE-PROCESSOR] Successfully burned captions`);
      } catch (captionError) {
        console.error(`❌ [TEMPLATE-PROCESSOR] Caption burning failed:`, captionError.message);
        console.log(`⚠️ [TEMPLATE-PROCESSOR] Continuing without captions`);
        finalVideoPath = outputVideoPath;
      }
    }

    console.log(`✅ [TEMPLATE-PROCESSOR] Video processing complete: ${finalVideoPath}`);
    return finalVideoPath;

  } catch (error) {
    // Cleanup on error
    console.error(`❌ [TEMPLATE-PROCESSOR] Processing failed:`, error);
    const filesToClean = [inputVideoPath, overlayImagePath, outputVideoPath];
    await cleanup(filesToClean);
    throw error;
  }
}

/**
 * Render HTML template to PNG using Puppeteer
 */
async function renderTemplateToImage(templateData) {
  console.log(`🎨 [PUPPETEER] Launching browser for template rendering...`);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    console.log(`✅ [PUPPETEER] Browser launched successfully`);

    return await processBrowser(browser, templateData);
  } catch (launchError) {
    console.error(`❌ [PUPPETEER] Failed to launch browser:`, launchError);
    throw new Error(`Puppeteer launch failed: ${launchError.message}`);
  }
}

/**
 * Process browser rendering
 */
async function processBrowser(browser, templateData) {
  try {
    const page = await browser.newPage();
    console.log(`📄 [PUPPETEER] Created new page`);

    // Set viewport to match video dimensions properly
    const width = templateData.aspectRatio === "vertical" ? 1080 : 1920;
    const height = templateData.aspectRatio === "vertical" ? 1920 : 1080;

    await page.setViewport({ width, height });
    console.log(`📐 [PUPPETEER] Set viewport: ${width}x${height}`);

    // Generate HTML template
    const html = generateTemplateHTML(templateData);
    console.log(`📝 [PUPPETEER] Generated HTML template for: ${templateData.template}`);
    console.log(`👤 [PUPPETEER] Using username: ${templateData.settings?.username || "default placeholder"}`);
    console.log(`🎨 [PUPPETEER] Using text color: ${templateData.settings?.textColor || "#ffffff"}`);
    console.log(`🖼️ [PUPPETEER] Has custom profile pic: ${templateData.settings?.profilePic ? "Yes" : "No"}`);
    console.log(`🌈 [PUPPETEER] HTML title with colors: ${templateData.title || "No HTML colors"}`);
    console.log(`📝 [PUPPETEER] Plain title fallback: ${templateData.plainTitle}`);
    console.log(`🔍 [PUPPETEER] HTML preview:`, html.substring(0, 200) + "...");

    // Set the HTML content
    await page.setContent(html, { waitUntil: "load" });
    console.log(`📋 [PUPPETEER] HTML content loaded`);

    // Take screenshot with transparent background
    const screenshot = await page.screenshot({
      type: "png",
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width,
        height,
      },
    });

    console.log(`✅ [PUPPETEER] Successfully rendered template to PNG (${screenshot.length} bytes)`);

    return screenshot;
  } catch (renderError) {
    console.error(`❌ [PUPPETEER] Rendering failed:`, renderError);
    throw new Error(`Template rendering failed: ${renderError.message}`);
  } finally {
    try {
      await browser.close();
      console.log(`🔒 [PUPPETEER] Browser closed successfully`);
    } catch (closeError) {
      console.error(`⚠️ [PUPPETEER] Error closing browser:`, closeError);
    }
  }
}

/**
 * Generate HTML template based on template type and data
 */
function generateTemplateHTML(templateData) {
  const { template, title, plainTitle, templateHeader, settings = {} } = templateData;

  // Define which templates should use templateHeader vs original title
  const templatesWithCustomTitles = ['social-profile', 'title-only'];
  const templatesWithOriginalTitles = ['blank', 'black-and-white', 'bw'];

  // Determine which text to use based on template type
  const shouldUseTemplateHeader = templatesWithCustomTitles.includes(template?.toLowerCase());
  const shouldUseOriginalTitle = templatesWithOriginalTitles.includes(template?.toLowerCase());

  // Select the appropriate text source
  let displayText;
  if (shouldUseTemplateHeader && templateHeader) {
    displayText = templateHeader;
  } else if (shouldUseOriginalTitle || !templateHeader) {
    displayText = title || plainTitle;
  } else {
    displayText = title || plainTitle;
  }

  // Get colors from settings
  const textColor = settings.textColor && settings.textColor !== "" ? settings.textColor : "#ffffff";
  const username = settings.username && settings.username.trim() ? settings.username : "username";

  // Check if user has custom profile pic
  const isBWTemplate = template === "bw-frame" || template === "black-and-white" || template === "bw";
  const logoSource = isBWTemplate ? settings.customImage : settings.profilePic;
  const hasCustomLogo = logoSource && logoSource !== "";

  // Base styles
  const baseStyle = `
    body { margin: 0; padding: 0; font-family: "Helvetica Neue", Roboto, "Segoe UI", Arial, sans-serif; }
    .container { position: relative; width: 100%; height: 100%; overflow: hidden; }
  `;

  // Handle blank/default template
  if (template === "default" || template === "blank") {
    return `
      <html>
        <head>
          <style>${baseStyle}</style>
        </head>
        <body>
          <div class="container">
            <!-- Blank template - no overlays -->
          </div>
        </body>
      </html>
    `;
  } else if (template === "social-profile") {
    return `
      <html>
        <head>
          <style>
            ${baseStyle}
            .profile-overlay {
              position: absolute;
              top: 50%;
              left: 24px;
              right: 24px;
              transform: translateY(-600%);
              background: rgba(0, 0, 0, 0);
              display: flex;
              flex-direction: column;
            }
            .user-info {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 10px;
            }
            .user-avatar {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: rgba(255,255,255,1.0);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .user-text {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .username {
              color: ${textColor};
              font-size: 20px;
              font-weight: 700;
              font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.2;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .checkmark {
              width: 20px;
              height: 20px;
              background: #1DA1F2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .checkmark::after {
              content: "✓";
              color: white;
              font-size: 12px;
              font-weight: bold;
            }
            .handle {
              color: ${textColor};
              font-size: 15px;
              font-weight: 400;
              font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              opacity: 0.7;
              line-height: 1.2;
            }
            .title {
              color: ${textColor};
              font-size: 24px;
              font-weight: 700;
              line-height: 1.3;
              font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              margin-top: 0;
              margin-left: 0;
              max-width: 100%;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="profile-overlay">
              <div class="user-info">
                <div class="user-avatar">
                  ${hasCustomLogo ?
                    `<img src="${logoSource}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;" />` :
                    `<div style="color: rgba(255,255,255,0.8); font-size: 16px;">👤</div>`
                  }
                </div>
                <div class="user-text">
                  <div class="username">
                    ${username}
                    <div class="checkmark"></div>
                  </div>
                  <div class="handle">@${username}</div>
                </div>
              </div>
              <div class="title">${displayText}</div>
            </div>
          </div>
        </body>
      </html>
    `;
  } else if (template === "title-only") {
    return `
      <html>
        <head>
          <style>
            ${baseStyle}
            .title-overlay {
              position: absolute;
              top: 50%;
              left: 24px;
              right: 24px;
              transform: translateY(-1300%);
              background: rgba(0, 0, 0, 0);
              display: flex;
              flex-direction: column;
            }
            .title {
              color: ${textColor};
              font-size: 28px;
              font-weight: 700;
              line-height: 1.3;
              font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              margin-top: 0;
              max-width: 100%;
              word-wrap: break-word;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title-overlay">
              <div class="title">${displayText}</div>
            </div>
          </div>
        </body>
      </html>
    `;
  } else if (template === "bw-frame") {
    return `
      <html>
        <head>
          <style>
            ${baseStyle}
            .bottom-logo {
              position: absolute;
              bottom: 200px;
              left: 50%;
              transform: translateX(-50%);
            }
            .logo-placeholder {
              width: 140px;
              height: 140px;
              border-radius: 50%;
              background: rgba(255,255,255,0.3);
              color: rgba(255,255,255,0.8);
              font-size: 32px;
              font-weight: 600;
              font-family: "Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-image {
              height: 360px;
              max-width: 750px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="bottom-logo">
              ${hasCustomLogo ?
                `<img src="${logoSource}" alt="Logo" class="logo-image" />` :
                `<div class="logo-placeholder">logo</div>`
              }
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Default template
  return `
    <html>
      <head>
        <style>
          ${baseStyle}
          .overlay {
            position: absolute;
            bottom: 10%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            padding: 12px 20px;
            border-radius: 8px;
          }
          .title {
            color: white;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="overlay">
            <div class="title">${displayText}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Overlay PNG image on video using FFmpeg
 */
async function overlayImageOnVideo(inputVideoPath, overlayImagePath, outputVideoPath, templateData = {}) {
  const { spawn } = await import("child_process");

  // Get background color from template settings
  const backgroundColor = templateData.settings?.overlayColor && templateData.settings.overlayColor !== ""
    ? templateData.settings.overlayColor
    : "#000000";

  // Check template type
  const isBlankTemplate = templateData.template === "default" || templateData.template === "blank";
  const isBWTemplate = templateData.template === "bw-frame" ||
                       templateData.template === "black-and-white" ||
                       templateData.template === "bw";

  // Get B&W settings
  const bwLevel = templateData.settings?.bwLevel || 50;
  const bwContrast = templateData.settings?.bwContrast || 130;
  const bwBrightness = templateData.settings?.bwBrightness || 80;

  console.log(`🎨 [FFMPEG] Template: ${templateData.template}, isBlank: ${isBlankTemplate}, isBW: ${isBWTemplate}`);
  if (isBWTemplate) {
    console.log(`🎨 [FFMPEG] B&W effects - Level: ${bwLevel}%, Contrast: ${bwContrast}%, Brightness: ${bwBrightness}%`);
  }

  return new Promise((resolve, reject) => {
    // Build filter complex
    let filterComplex;

    if (isBlankTemplate) {
      filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black[output]`;
    } else if (isBWTemplate) {
      filterComplex =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}[scaled_video_temp];` +
        `[scaled_video_temp]colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0:0:0:0:1[bw_temp];` +
        `[bw_temp]eq=contrast=${bwContrast/100}:brightness=${(bwBrightness-100)/100}[bw_video];` +
        "[bw_video][1:v]overlay=0:0[output]";
    } else {
      filterComplex =
        `[0:v]scale=1080:800:force_original_aspect_ratio=increase,crop=1080:800[scaled_video_temp];` +
        `[scaled_video_temp]pad=1080:1920:0:(oh-ih)/2:color=${backgroundColor}[scaled_video];` +
        "[scaled_video][1:v]overlay=0:0[output]";
    }

    let args;

    if (isBlankTemplate) {
      args = [
        "-i", inputVideoPath,
        "-filter_complex", filterComplex,
        "-map", "[output]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-t", "30",
        "-y", outputVideoPath,
      ];
    } else {
      args = [
        "-i", inputVideoPath,
        "-i", overlayImagePath,
        "-filter_complex", filterComplex,
        "-map", "[output]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-t", "30",
        "-y", outputVideoPath,
      ];
    }

    console.log(`🎬 [FFMPEG] Command: ffmpeg ${args.join(" ")}`);

    const ffmpeg = spawn("ffmpeg", args);
    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ [FFMPEG] Video overlay completed successfully`);
        resolve(outputVideoPath);
      } else {
        console.error(`❌ [FFMPEG] Process exited with code ${code}`);
        console.error(`[FFMPEG] stderr: ${stderr}`);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error(`❌ [FFMPEG] Process error:`, error);
      reject(error);
    });
  });
}

/**
 * Clean up temporary files
 */
async function cleanup(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ [CLEANUP] Removed: ${filePath}`);
    } catch (error) {
      console.log(`⚠️ [CLEANUP] Could not remove: ${filePath}`);
    }
  }
}
