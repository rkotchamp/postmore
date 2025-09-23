/**
 * Font Manager Service
 * Manages system fonts for video caption rendering
 * Supports: Bebas Neue (Impact), Montserrat (Arial Bold), Anton (Impact), Oswald (Arial Narrow), Roboto (Arial)
 */

const fs = require('fs');
const path = require('path');

// Font configurations for video captions
// Using system fonts that are commonly available
const CAPTION_FONTS = {
  bebasNeue: {
    name: "Bebas Neue",
    family: "Impact",
    weight: "400",
    description: "Bold & Condensed - Perfect for viral content",
    systemFont: "Impact",
    ffmpegFont: "Impact"
  },
  montserrat: {
    name: "Montserrat",
    family: "Arial",
    weight: "bold",
    description: "Clean & Modern - Professional look",
    systemFont: "Arial",
    ffmpegFont: "Arial"
  },
  anton: {
    name: "Anton",
    family: "Impact",
    weight: "400",
    description: "Heavy & Impactful - Attention-grabbing",
    systemFont: "Impact",
    ffmpegFont: "Impact"
  },
  oswald: {
    name: "Oswald",
    family: "Arial",
    weight: "600",
    description: "Tall & Narrow - Space-efficient",
    systemFont: "Arial",
    ffmpegFont: "Arial"
  },
  roboto: {
    name: "Roboto",
    family: "Arial",
    weight: "700",
    description: "Standard & Reliable - Universal support",
    systemFont: "Arial",
    ffmpegFont: "Arial"
  }
};

/**
 * Get font configuration for a specific font
 * @param {string} fontKey - Font key from CAPTION_FONTS
 * @returns {Object} - Font configuration
 */
function getFontConfig(fontKey) {
  const font = CAPTION_FONTS[fontKey];
  if (!font) {
    throw new Error(`Unknown font: ${fontKey}. Available fonts: ${Object.keys(CAPTION_FONTS).join(', ')}`);
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
      console.log(`  • ${font.name} → ${font.ffmpegFont} (${font.description})`);
    });

    console.log(`🎨 [FONT-MANAGER] Font system ready with ${Object.keys(CAPTION_FONTS).length} fonts!`);
  } catch (error) {
    console.error(`❌ [FONT-MANAGER] Font system initialization failed:`, error);
  }
}

/**
 * Get font configuration for FFmpeg drawtext filter
 * @param {string} fontKey - Font key
 * @returns {Object} - Font config for FFmpeg
 */
function getFontConfigForFFmpeg(fontKey) {
  const font = getFontConfig(fontKey);

  return {
    fontname: font.ffmpegFont,
    fontfamily: font.family,
    fontweight: font.weight,
    description: font.description,
    systemFont: font.systemFont
  };
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
  return 'roboto';
}

module.exports = {
  getFontConfig,
  getFontForFFmpeg,
  getAvailableFonts,
  initializeFonts,
  getFontConfigForFFmpeg,
  isFontSupported,
  getDefaultFont,
  CAPTION_FONTS
};