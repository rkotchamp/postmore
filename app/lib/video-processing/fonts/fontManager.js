/**
 * Font Manager Service
 * Manages system fonts for video caption rendering and FFmpeg subtitle burning
 * Supports cross-platform font mapping for macOS, Windows, Linux
 * Uses standard system fonts with FFmpeg subtitles filter and force_style
 */

const fs = require("fs");
const path = require("path");

// Font weight mapping for FFmpeg force_style
const FONT_WEIGHTS = {
  light: { weight: "300", bold: "0" },
  normal: { weight: "400", bold: "0" },
  medium: { weight: "500", bold: "0" },
  semibold: { weight: "600", bold: "-1" }, // Use Bold=-1 for semibold
  bold: { weight: "700", bold: "1" }, // Use Bold=1 for bold
  extrabold: { weight: "800", bold: "1" }, // Use Bold=1 for extra bold
};

// Font size mapping for FFmpeg ASS subtitles (in points)
// With PlayResX/PlayResY set, ASS font sizes scale relative to video resolution
// For 1920px tall vertical video (9:16 aspect ratio), we need larger point values
const FONT_SIZES = {
  verysmall: { size: "27", scale: 1.0 }, // ~1.0rem (16px) in CSS - smallest readable
  small: { size: "33", scale: 1.2 }, // ~1.2rem (19px) in CSS
  medium: { size: "39", scale: 1.5 }, // ~1.5rem (24px) in CSS
  large: { size: "49", scale: 1.8 }, // ~1.8rem (29px) in CSS
};

// Font directory path - where .ttf files are stored
// Use process.cwd() instead of __dirname for Next.js compatibility
const FONTS_DIR = path.join(
  process.cwd(),
  "app",
  "lib",
  "video-processing",
  "fonts"
);

// Font configurations for video captions
// Using actual .ttf font files for accurate rendering
const CAPTION_FONTS = {
  raleway: {
    name: "Raleway",
    ffmpegFont: "Raleway",
    fontFile: "Raleway-Regular.ttf",
    boldFile: "Raleway-Bold.ttf",
    description: "Elegant & Modern - Sophisticated style",
  },
  inter: {
    name: "Inter",
    ffmpegFont: "Inter",
    fontFile: "Inter-Regular.ttf",
    boldFile: "Inter-Bold.ttf",
    description: "Digital & Clean - Perfect readability",
  },
  bebasNeue: {
    name: "Bebas Neue",
    ffmpegFont: "Bebas Neue",
    fontFile: "BebasNeue-Regular.ttf",
    boldFile: "BebasNeue-Regular.ttf",
    description: "Bold & Condensed - Perfect for viral content",
  },
  montserrat: {
    name: "Montserrat",
    ffmpegFont: "Montserrat",
    fontFile: "Montserrat-Regular.ttf",
    boldFile: "Montserrat-Bold.ttf",
    description: "Clean & Modern - Professional look",
  },
  anton: {
    name: "Anton",
    ffmpegFont: "Anton",
    fontFile: "Anton-Regular.ttf",
    boldFile: "Anton-Regular.ttf",
    description: "Heavy & Impactful - Attention-grabbing",
  },
  oswald: {
    name: "Oswald",
    ffmpegFont: "Oswald",
    fontFile: "Oswald-Regular.ttf",
    boldFile: "Oswald-Bold.ttf",
    description: "Tall & Narrow - Space-efficient",
  },
  roboto: {
    name: "Roboto",
    ffmpegFont: "Roboto",
    fontFile: "Roboto-Regular.ttf",
    boldFile: "Roboto-Bold.ttf",
    description: "Standard & Reliable - Universal support",
  },
};

/**
 * Get font configuration for a specific font
 * @param {string} fontKey - Font key from CAPTION_FONTS
 * @returns {Object} - Font configuration
 */
function getFontConfig(fontKey) {
  const font = CAPTION_FONTS[fontKey];
  if (!font) {
    throw new Error(
      `Unknown font: ${fontKey}. Available fonts: ${Object.keys(
        CAPTION_FONTS
      ).join(", ")}`
    );
  }

  return font;
}

/**
 * Get font name for FFmpeg drawtext filter
 * @param {string} fontKey - Font key
 * @returns {string} - Font name for FFmpeg
 */
function getFontForFFmpeg(fontKey) {
  const font = getFontConfig(fontKey);
  return font.ffmpegFont;
}

/**
 * Get all available fonts configuration
 * @returns {Object} - All caption fonts configuration
 */
function getAvailableFonts() {
  return CAPTION_FONTS;
}

/**
 * Initialize font system - just log available fonts
 * @returns {Promise<void>}
 */
async function initializeFonts() {
  try {
    console.log(`🎨 [FONT-MANAGER] Initializing caption fonts system...`);
    console.log(`🎨 [FONT-MANAGER] Available fonts:`);

    Object.entries(CAPTION_FONTS).forEach(([key, font]) => {
      console.log(
        `  • ${font.name} → ${font.ffmpegFont} (${font.description})`
      );
    });

    console.log(
      `🎨 [FONT-MANAGER] Font system ready with ${
        Object.keys(CAPTION_FONTS).length
      } fonts!`
    );
  } catch (error) {
    console.error(
      `❌ [FONT-MANAGER] Font system initialization failed:`,
      error
    );
  }
}

/**
 * Get font configuration for FFmpeg subtitles filter
 * @param {string} fontKey - Font key
 * @returns {Object} - Font config for FFmpeg
 */
function getFontConfigForFFmpeg(fontKey) {
  const font = getFontConfig(fontKey);

  return {
    fontname: font.ffmpegFont,
    name: font.name,
    description: font.description,
  };
}

/**
 * Generate FFmpeg force_style string for subtitle burning
 * @param {Object} captionSettings - Caption settings from frontend
 * @param {string} captionSettings.font - Font key
 * @param {string} captionSettings.size - Size key (verysmall, small, medium, large)
 * @param {string} captionSettings.weight - Weight key (light, normal, medium, semibold, bold, extrabold)
 * @param {string} captionSettings.position - Position key (top, center, bottom)
 * @param {Object} videoDimensions - Video dimensions from ffprobe
 * @param {number} videoDimensions.width - Video width in pixels
 * @param {number} videoDimensions.height - Video height in pixels
 * @returns {string} - FFmpeg force_style parameter
 */
function generateFFmpegForceStyle(captionSettings, videoDimensions = { width: 1080, height: 1920 }) {
  const {
    font = "roboto",
    size = "medium",
    weight = "normal",
    position = "bottom",
  } = captionSettings;

  console.log(
    "🎨 [FONT-MANAGER] Generating FFmpeg force_style with user settings:",
    {
      font,
      size,
      weight,
      position,
      videoDimensions: `${videoDimensions.width}x${videoDimensions.height}`,
    }
  );

  // Get configurations
  const fontConfig = getFontConfig(font);
  const fontWeight = FONT_WEIGHTS[weight] || FONT_WEIGHTS.normal;
  const fontSize = FONT_SIZES[size] || FONT_SIZES.medium;

  console.log("🎨 [FONT-MANAGER] Resolved configurations:", {
    fontName: fontConfig.ffmpegFont,
    fontSize: fontSize.size,
    fontWeight: fontWeight.bold,
    alignment: position === "top" ? "8" : position === "center" ? "5" : "2",
  });

  // Build force_style parameters for clean white text (matching CSS appearance)
  // IMPORTANT: PlayResX and PlayResY tell ASS the video resolution for proper centering
  // Without these, ASS assumes 384x288 which breaks horizontal alignment
  const styleParams = [
    `PlayResX=${videoDimensions.width}`, // Dynamic video width
    `PlayResY=${videoDimensions.height}`, // Dynamic video height
    `FontName=${fontConfig.ffmpegFont}`,
    `FontSize=${fontSize.size}`,
    `Bold=${fontWeight.bold}`,
    `PrimaryColour=&Hffffff&`, // White text
    `OutlineColour=&H000000&`, // Black outline (only used if Outline > 0)
    `Outline=0`, // No outline for clean CSS-like appearance
    `Shadow=0`, // No shadow for clean CSS-like appearance
    `BorderStyle=0`, // No border
  ];

  // Adjust alignment and margin based on position
  // ASS Alignment: 1=left-bottom, 2=center-bottom, 3=right-bottom
  //               4=left-middle, 5=center-middle, 6=right-middle
  //               7=left-top, 8=center-top, 9=right-top
  //
  // IMPORTANT: Only Alignment=2 centers horizontally correctly
  // So we use Alignment=2 for ALL positions and adjust vertical position with MarginV
  // MarginV counts from BOTTOM of screen when using Alignment=2
  if (position === "top") {
    // Top position - use large MarginV to push from bottom up to near top
    styleParams.push("Alignment=2"); // Center horizontal, bottom anchor
    styleParams.push("MarginV=1650"); // Large margin pushes text to top area
  } else if (position === "center") {
    // Center position - use medium MarginV to place in middle
    styleParams.push("Alignment=2"); // Center horizontal, bottom anchor
    styleParams.push("MarginV=900"); // Medium margin places text in center
  } else {
    // Bottom position - use small MarginV to keep at bottom
    styleParams.push("Alignment=2"); // Center horizontal, bottom anchor
    styleParams.push("MarginV=50"); // Small margin from bottom edge
  }

  const forceStyle = styleParams.join(",");
  console.log("✅ [FONT-MANAGER] Generated force_style:", forceStyle);

  return forceStyle;
}

/**
 * Validate that a font key is supported
 * @param {string} fontKey - Font key to validate
 * @returns {boolean} - True if font is supported
 */
function isFontSupported(fontKey) {
  return Object.prototype.hasOwnProperty.call(CAPTION_FONTS, fontKey);
}

/**
 * Get default font key
 * @returns {string} - Default font key
 */
function getDefaultFont() {
  return "roboto";
}

/**
 * Get the fonts directory path for FFmpeg fontsdir parameter
 * @returns {string} - Absolute path to fonts directory
 */
function getFontsDirectory() {
  return FONTS_DIR;
}

module.exports = {
  getFontConfig,
  getFontForFFmpeg,
  getAvailableFonts,
  initializeFonts,
  getFontConfigForFFmpeg,
  generateFFmpegForceStyle,
  isFontSupported,
  getDefaultFont,
  getFontsDirectory,
  CAPTION_FONTS,
  FONT_WEIGHTS,
  FONT_SIZES,
};
