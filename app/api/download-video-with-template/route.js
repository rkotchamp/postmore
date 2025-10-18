import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { applyCaptionsWithFont, burnSubtitlesIntoVideo } from "@/app/lib/video-processing/services/captionService";
import connectToMongoose from "@/app/lib/db/mongoose";
import VideoClip from "@/app/models/VideoClip";
import VideoProject from "@/app/models/VideoProject";

/**
 * POST /api/download-video-with-template
 * Process video with template overlay and return as downloadable file
 * Uses Puppeteer to render HTML templates + FFmpeg for video overlay
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, filename, templateData, captionData, captionSettings } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    if (!templateData || !templateData.template) {
      return NextResponse.json(
        { error: "Template data is required" },
        { status: 400 }
      );
    }

    console.log(
      `🎬 [TEMPLATE-DOWNLOAD] Processing video with template: ${templateData.template}`
    );
    console.log(`📝 [TEMPLATE-DOWNLOAD] Template data:`, templateData);
    console.log(`🖼️ [TEMPLATE-DOWNLOAD] Settings:`, templateData.settings);
    console.log(`👤 [TEMPLATE-DOWNLOAD] Settings.profilePic:`, templateData.settings?.profilePic);
    console.log(`👤 [TEMPLATE-DOWNLOAD] Settings.username:`, templateData.settings?.username);

    // Log caption burning parameters
    if (captionData && captionSettings) {
      console.log(`🔥 [CAPTION-BURN] Caption burning requested`);
      console.log(`📄 [CAPTION-BURN] Caption data:`, {
        captionCount: captionData.captions?.length,
        totalDuration: captionData.totalDuration
      });
      console.log(`🎨 [CAPTION-BURN] Caption settings:`, captionSettings);
    }

    // Download the original video first
    console.log(
      `📥 [TEMPLATE-DOWNLOAD] Downloading source video from: ${videoUrl}`
    );
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    // Save temporary files
    const tempDir = "/tmp";
    const timestamp = Date.now();
    const inputVideoPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const overlayImagePath = path.join(tempDir, `overlay_${timestamp}.png`);
    const outputVideoPath = path.join(tempDir, `output_${timestamp}.mp4`);

    try {
      // Save input video
      const inputVideoBuffer = await videoResponse.arrayBuffer();
      await fs.writeFile(inputVideoPath, new Uint8Array(inputVideoBuffer));
      console.log(
        `💾 [TEMPLATE-DOWNLOAD] Saved input video: ${inputVideoPath}`
      );

      // Check template type
      const isBlankTemplate = templateData.template === "default" || templateData.template === "blank";
      const isBWTemplate = templateData.template === "bw-frame" || 
                           templateData.template === "black-and-white" || 
                           templateData.template === "bw";

      let overlayBuffer;
      if (!isBlankTemplate) {
        // Only render overlay for non-blank templates
        console.log(`🎨 [TEMPLATE-DOWNLOAD] Rendering HTML template to PNG...`);
        try {
          overlayBuffer = await renderTemplateToImage(templateData);
          console.log(`✅ [TEMPLATE-DOWNLOAD] Template rendered successfully`);
        } catch (puppeteerError) {
          console.error(
            `❌ [TEMPLATE-DOWNLOAD] Puppeteer rendering failed:`,
            puppeteerError
          );
          throw new Error(`Template rendering failed: ${puppeteerError.message}`);
        }

        await fs.writeFile(overlayImagePath, overlayBuffer);
        console.log(
          `🖼️ [TEMPLATE-DOWNLOAD] Saved overlay image: ${overlayImagePath}`
        );
      } else {
        console.log(`🎨 [TEMPLATE-DOWNLOAD] Blank template - skipping overlay generation`);
      }

      // Step 2: Use FFmpeg to overlay PNG on video (with B&W effects if needed)
      console.log(`🎬 [TEMPLATE-DOWNLOAD] Processing video with FFmpeg...`);
      try {
        await overlayImageOnVideo(
          inputVideoPath,
          overlayImagePath,
          outputVideoPath,
          templateData
        );
        console.log(`✅ [TEMPLATE-DOWNLOAD] Video processing completed`);
      } catch (ffmpegError) {
        console.error(
          `❌ [TEMPLATE-DOWNLOAD] FFmpeg processing failed:`,
          ffmpegError
        );
        throw new Error(`Video overlay failed: ${ffmpegError.message}`);
      }

      // Step 2.5: Burn captions into video if caption data provided
      let finalVideoPath = outputVideoPath;
      if (captionData && captionSettings) {
        console.log(`🔥 [CAPTION-BURN] Starting caption burning process...`);
        console.log(`📄 [CAPTION-BURN] Burning ${captionData.captions?.length || 0} captions with font: ${captionSettings.font}, size: ${captionSettings.size}, position: ${captionSettings.position}`);

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
          console.log(`✅ [CAPTION-BURN] Successfully burned ${captionData.captions?.length || 0} captions into video`);
        } catch (captionError) {
          console.error(`❌ [CAPTION-BURN] Caption burning failed:`, captionError.message);
          console.error(`🔍 [CAPTION-BURN] Error details:`, {
            captionCount: captionData.captions?.length,
            settings: captionSettings,
            error: captionError.stack?.substring(0, 500)
          });

          // Continue without captions rather than failing the entire request
          console.log(`⚠️ [CAPTION-BURN] Gracefully continuing without burned captions - template overlay will still work`);
          finalVideoPath = outputVideoPath; // Use original template output
        }
      }

      // Step 3: Read the processed video as a buffer
      const videoBuffer = await fs.readFile(finalVideoPath);

      // Ensure we have a proper buffer for binary data
      const finalBuffer = Buffer.isBuffer(videoBuffer) ? videoBuffer : Buffer.from(videoBuffer);

      // Clean up temporary files
      const filesToClean = [inputVideoPath, outputVideoPath];
      if (!isBlankTemplate) {
        filesToClean.push(overlayImagePath);
      }
      // Add caption burned file to cleanup if it was created
      if (finalVideoPath !== outputVideoPath) {
        filesToClean.push(finalVideoPath);
      }
      await cleanup(filesToClean);

      console.log(
        `📤 [TEMPLATE-DOWNLOAD] Returning processed video: ${filename}`
      );
      console.log(
        `📦 [TEMPLATE-DOWNLOAD] Video buffer size: ${finalBuffer.length} bytes`
      );

      // Use standard Response constructor for binary data (most reliable approach)
      return new Response(finalBuffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Content-Length": finalBuffer.length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    } catch (processingError) {
      console.error(
        "❌ [TEMPLATE-DOWNLOAD] Processing failed:",
        processingError
      );

      // Clean up on failure
      const filesToClean = [inputVideoPath, outputVideoPath];
      if (!isBlankTemplate) {
        filesToClean.push(overlayImagePath);
      }
      await cleanup(filesToClean);

      throw processingError;
    }
  } catch (error) {
    console.error("❌ [TEMPLATE-DOWNLOAD] Error processing video:", error);
    return NextResponse.json(
      {
        error: "Failed to process video with template",
        details: error.message,
      },
      { status: 500 }
    );
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
    // Standard video resolutions
    const width = templateData.aspectRatio === "vertical" ? 1080 : 1920;
    const height = templateData.aspectRatio === "vertical" ? 1920 : 1080;

    await page.setViewport({ width, height });
    console.log(`📐 [PUPPETEER] Set viewport: ${width}x${height}`);

    // Generate HTML template based on template type
    const html = generateTemplateHTML(templateData);
    console.log(
      `📝 [PUPPETEER] Generated HTML template for: ${templateData.template}`
    );
    console.log(
      `👤 [PUPPETEER] Using username: ${
        templateData.settings?.username || "default placeholder"
      }`
    );
    console.log(
      `🎨 [PUPPETEER] Using text color: ${
        templateData.settings?.textColor || "#ffffff"
      }`
    );
    console.log(
      `🖼️ [PUPPETEER] Has custom profile pic: ${
        templateData.settings?.profilePic ? "Yes" : "No"
      }`
    );
    console.log(
      `🌈 [PUPPETEER] HTML title with colors: ${
        templateData.title || "No HTML colors"
      }`
    );
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

    console.log(
      `✅ [PUPPETEER] Successfully rendered template to PNG (${screenshot.length} bytes)`
    );

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
    displayText = templateHeader; // Use edited templateHeader for custom title templates
    console.log(`📝 [TEMPLATE-TEXT] Using templateHeader for ${template}: ${templateHeader.substring(0, 50)}...`);
  } else if (shouldUseOriginalTitle || !templateHeader) {
    displayText = title || plainTitle; // Use original title for blank/bw templates or fallback
    console.log(`📝 [TEMPLATE-TEXT] Using original title for ${template}: ${(title || plainTitle)?.substring(0, 50)}...`);
  } else {
    displayText = title || plainTitle; // Default fallback
    console.log(`📝 [TEMPLATE-TEXT] Using fallback title for ${template}: ${(title || plainTitle)?.substring(0, 50)}...`);
  }

  // Get colors from settings - ensure defaults are proper
  const textColor =
    settings.textColor && settings.textColor !== ""
      ? settings.textColor
      : "#ffffff"; // Default to white text

  // Use custom username if provided, otherwise use default placeholder
  const username =
    settings.username && settings.username.trim()
      ? settings.username
      : "username";

  // Check if user has custom profile pic (different for B&W templates)
  const isBWTemplate = template === "bw-frame" || 
                       template === "black-and-white" || 
                       template === "bw";
  
  const logoSource = isBWTemplate ? settings.customImage : settings.profilePic;
  const hasCustomLogo = logoSource && logoSource !== "";
    
  console.log('🖼️ [LOGO-CHECK] Template:', template);
  console.log('🖼️ [LOGO-CHECK] isBWTemplate:', isBWTemplate);
  console.log('🖼️ [LOGO-CHECK] settings.profilePic:', settings.profilePic ? 'EXISTS' : 'NULL');
  console.log('🖼️ [LOGO-CHECK] settings.customImage:', settings.customImage ? 'EXISTS' : 'NULL');
  console.log('🖼️ [LOGO-CHECK] logoSource:', logoSource ? 'EXISTS' : 'NULL');
  console.log('🖼️ [LOGO-CHECK] hasCustomLogo:', hasCustomLogo);

  // Base styles with Twitter-inspired font stack
  const baseStyle = `
    body { margin: 0; padding: 0; font-family: "Helvetica Neue", Roboto, "Segoe UI", Arial, sans-serif; }
    .container { position: relative; width: 100%; height: 100%; overflow: hidden; }
  `;

  // Handle blank/default template - no overlays needed
  if (template === "default" || template === "blank") {
    return `
      <html>
        <head>
          <style>
            ${baseStyle}
          </style>
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
    console.log('🎨 [BW-TEMPLATE] Generating B&W template HTML');
    console.log('🎨 [BW-TEMPLATE] hasCustomLogo:', hasCustomLogo);
    console.log('🎨 [BW-TEMPLATE] logoSource preview:', logoSource ? logoSource.substring(0, 50) + '...' : 'NULL');
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
async function overlayImageOnVideo(
  inputVideoPath,
  overlayImagePath,
  outputVideoPath,
  templateData = {}
) {
  const { spawn } = await import("child_process");

  // Get background color from template settings, default to black
  const backgroundColor =
    templateData.settings?.overlayColor &&
    templateData.settings.overlayColor !== ""
      ? templateData.settings.overlayColor
      : "#000000"; // Default to black background

  // Check template type
  const isBlankTemplate = templateData.template === "default" || templateData.template === "blank";
  const isBWTemplate = templateData.template === "bw-frame" || 
                       templateData.template === "black-and-white" || 
                       templateData.template === "bw";
  
  // Get B&W settings from templateData (passed from frontend controls)
  const bwLevel = templateData.settings?.bwLevel || 50; // Default grayscale level
  const bwContrast = templateData.settings?.bwContrast || 130; // Default contrast
  const bwBrightness = templateData.settings?.bwBrightness || 80; // Default brightness
  
  console.log(`🎨 [TEMPLATE-TYPE] Template: ${templateData.template}, isBlank: ${isBlankTemplate}, isBW: ${isBWTemplate}`);
  if (isBWTemplate) {
    console.log(`🎨 [BW-EFFECTS] Applying B&W effects - Level: ${bwLevel}%, Contrast: ${bwContrast}%, Brightness: ${bwBrightness}%`);
  }

  return new Promise((resolve, reject) => {
    console.log(`🔍 [FFMPEG] Processing video with template: ${templateData.template}`);
    
    // Build the filter complex chain based on template type
    let filterComplex;
    
    if (isBlankTemplate) {
      // For blank templates: Just scale to 9:16 without any overlays or cropping
      filterComplex = 
        `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black[output]`;
    } else if (isBWTemplate) {
      // For B&W templates: Apply grayscale, contrast, and brightness effects + overlay
      // Keep full 9:16 aspect ratio without cropping
      filterComplex = 
        // Step 1: Scale to 9:16 without cropping
        `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}[scaled_video_temp];` +
        // Step 2: Apply B&W effects (grayscale, contrast, brightness) 
        `[scaled_video_temp]colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0:0:0:0:1[bw_temp];` +
        `[bw_temp]eq=contrast=${bwContrast/100}:brightness=${(bwBrightness-100)/100}[bw_video];` +
        // Step 3: Overlay the template (logo) on top of the B&W video
        "[bw_video][1:v]overlay=0:0[output]";
    } else {
      // For normal templates: Standard processing without B&W effects  
      filterComplex = 
        // Step 1: Scale and crop video
        `[0:v]scale=1080:800:force_original_aspect_ratio=increase,crop=1080:800[scaled_video_temp];` +
        // Step 2: Pad to full 9:16 with background color
        `[scaled_video_temp]pad=1080:1920:0:(oh-ih)/2:color=${backgroundColor}[scaled_video];` +
        // Step 3: Overlay template on video
        "[scaled_video][1:v]overlay=0:0[output]";
    }
    
    let args;
    
    if (isBlankTemplate) {
      // For blank templates: Don't use overlay, just process the video directly
      args = [
        "-i",
        inputVideoPath, // Input video only
        "-filter_complex",
        filterComplex,
        "-map",
        "[output]", // Map the output video
        "-map",
        "0:a", // Map the original audio
        "-c:v",
        "libx264", // Force video codec
        "-c:a", 
        "aac", // Force audio codec
        "-pix_fmt",
        "yuv420p", // Ensure compatible pixel format
        "-t",
        "30", // Limit to 30 seconds for testing
        "-y", // Overwrite output
        outputVideoPath,
      ];
    } else {
      // For templates with overlays
      args = [
        "-i",
        inputVideoPath, // Input video
        "-i", 
        overlayImagePath, // Overlay PNG
        "-filter_complex",
        filterComplex,
        "-map",
        "[output]", // Map the output video
        "-map",
        "0:a", // Map the original audio
        "-c:v",
        "libx264", // Force video codec
        "-c:a", 
        "aac", // Force audio codec
        "-pix_fmt",
        "yuv420p", // Ensure compatible pixel format
        "-t",
        "30", // Limit to 30 seconds for testing
        "-y", // Overwrite output
        outputVideoPath,
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
      // Ignore errors for cleanup
      console.log(`⚠️ [CLEANUP] Could not remove: ${filePath}`);
    }
  }
}
