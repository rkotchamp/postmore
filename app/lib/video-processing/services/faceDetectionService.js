/**
 * Face Detection Service
 * Handles face detection for smart video cropping using OpenCV4nodejs
 */

// Note: opencv4nodejs will be installed as a package dependency
let cv;
try {
  cv = require('opencv4nodejs');
} catch (error) {
  console.warn('OpenCV4nodejs not available. Face detection features will be disabled.');
}

class FaceDetectionService {
  constructor() {
    this.isAvailable = !!cv;
    this.classifier = null;
    
    if (this.isAvailable) {
      try {
        // Load Haar Cascade classifier for face detection
        this.classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
      } catch (error) {
        console.warn('Failed to load face detection classifier:', error.message);
        this.isAvailable = false;
      }
    }
  }

  /**
   * Detect faces in video frame
   * @param {string} imagePath - Path to image/frame
   * @returns {Promise<Array>} Array of face rectangles
   */
  async detectFacesInImage(imagePath) {
    if (!this.isAvailable) {
      throw new Error('Face detection not available. OpenCV4nodejs not installed.');
    }

    try {
      // Read image
      const image = cv.imread(imagePath);
      
      // Convert to grayscale for face detection
      const grayImage = image.bgrToGray();
      
      // Detect faces
      const faces = this.classifier.detectMultiScale(grayImage, {
        scaleFactor: 1.1,
        minNeighbors: 3,
        minSize: new cv.Size(30, 30)
      });

      return faces.objects.map(face => ({
        x: face.x,
        y: face.y,
        width: face.width,
        height: face.height,
        centerX: face.x + face.width / 2,
        centerY: face.y + face.height / 2
      }));
    } catch (error) {
      throw new Error(`Face detection failed: ${error.message}`);
    }
  }

  /**
   * Detect faces in video at specified intervals
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of face detection results per frame
   */
  async detectFacesInVideo(videoPath, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Face detection not available. OpenCV4nodejs not installed.');
    }

    try {
      const cap = new cv.VideoCapture(videoPath);
      const fps = cap.get(cv.CAP_PROP_FPS);
      const frameCount = cap.get(cv.CAP_PROP_FRAME_COUNT);
      
      const sampleInterval = options.sampleInterval || Math.floor(fps); // Sample every second by default
      const maxSamples = options.maxSamples || 10;
      
      const results = [];
      let frameIndex = 0;
      
      while (frameIndex < frameCount && results.length < maxSamples) {
        cap.set(cv.CAP_PROP_POS_FRAMES, frameIndex);
        const frame = cap.read();
        
        if (frame.empty) {
          break;
        }

        const grayFrame = frame.bgrToGray();
        const faces = this.classifier.detectMultiScale(grayFrame, {
          scaleFactor: 1.1,
          minNeighbors: 3,
          minSize: new cv.Size(30, 30)
        });

        results.push({
          frameIndex,
          timestamp: frameIndex / fps,
          faces: faces.objects.map(face => ({
            x: face.x,
            y: face.y,
            width: face.width,
            height: face.height,
            centerX: face.x + face.width / 2,
            centerY: face.y + face.height / 2,
            confidence: 1.0 // Haar cascades don't provide confidence scores
          }))
        });

        frameIndex += sampleInterval;
      }

      cap.release();
      return results;
    } catch (error) {
      throw new Error(`Video face detection failed: ${error.message}`);
    }
  }

  /**
   * Calculate optimal crop region based on face positions
   * @param {Array} faceResults - Face detection results from video
   * @param {Object} videoInfo - Video dimensions and metadata
   * @param {Object} targetSpecs - Target video specifications
   * @returns {Object} Optimal crop region
   */
  calculateOptimalCrop(faceResults, videoInfo, targetSpecs) {
    if (!faceResults || faceResults.length === 0) {
      // No faces detected, use center crop
      return this.getCenterCrop(videoInfo, targetSpecs);
    }

    // Collect all face positions
    const allFaces = [];
    faceResults.forEach(result => {
      allFaces.push(...result.faces);
    });

    if (allFaces.length === 0) {
      return this.getCenterCrop(videoInfo, targetSpecs);
    }

    // Calculate bounding box that includes most faces
    const faceRegion = this.calculateFaceBoundingBox(allFaces);
    
    // Adjust crop region to include face area while maintaining aspect ratio
    return this.adjustCropForFaces(faceRegion, videoInfo, targetSpecs);
  }

  /**
   * Calculate bounding box for all detected faces
   * @param {Array} faces - Array of face rectangles
   * @returns {Object} Bounding box containing all faces
   */
  calculateFaceBoundingBox(faces) {
    const minX = Math.min(...faces.map(f => f.x));
    const minY = Math.min(...faces.map(f => f.y));
    const maxX = Math.max(...faces.map(f => f.x + f.width));
    const maxY = Math.max(...faces.map(f => f.y + f.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Adjust crop region to include faces while maintaining target aspect ratio
   * @param {Object} faceRegion - Face bounding box
   * @param {Object} videoInfo - Original video dimensions
   * @param {Object} targetSpecs - Target video specifications
   * @returns {Object} Adjusted crop region
   */
  adjustCropForFaces(faceRegion, videoInfo, targetSpecs) {
    const targetAspectRatio = targetSpecs.width / targetSpecs.height;
    const videoWidth = videoInfo.width;
    const videoHeight = videoInfo.height;

    // Start with face region center
    let cropCenterX = faceRegion.centerX;
    let cropCenterY = faceRegion.centerY;

    // Calculate crop dimensions based on target aspect ratio
    let cropWidth, cropHeight;
    
    if (videoWidth / videoHeight > targetAspectRatio) {
      // Video is wider than target, crop width
      cropHeight = videoHeight;
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      // Video is taller than target, crop height
      cropWidth = videoWidth;
      cropHeight = cropWidth / targetAspectRatio;
    }

    // Ensure crop region includes face area
    const faceBuffer = 50; // Add buffer around faces
    const minCropX = Math.max(0, faceRegion.x - faceBuffer);
    const maxCropX = Math.min(videoWidth - cropWidth, faceRegion.x + faceRegion.width + faceBuffer - cropWidth);
    const minCropY = Math.max(0, faceRegion.y - faceBuffer);
    const maxCropY = Math.min(videoHeight - cropHeight, faceRegion.y + faceRegion.height + faceBuffer - cropHeight);

    // Adjust crop center to stay within bounds
    cropCenterX = Math.max(cropWidth / 2, Math.min(videoWidth - cropWidth / 2, cropCenterX));
    cropCenterY = Math.max(cropHeight / 2, Math.min(videoHeight - cropHeight / 2, cropCenterY));

    // Final crop position
    let cropX = cropCenterX - cropWidth / 2;
    let cropY = cropCenterY - cropHeight / 2;

    // Ensure crop stays within video bounds
    cropX = Math.max(0, Math.min(videoWidth - cropWidth, cropX));
    cropY = Math.max(0, Math.min(videoHeight - cropHeight, cropY));

    return {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    };
  }

  /**
   * Get center crop when no faces are detected
   * @param {Object} videoInfo - Original video dimensions
   * @param {Object} targetSpecs - Target video specifications
   * @returns {Object} Center crop region
   */
  getCenterCrop(videoInfo, targetSpecs) {
    const targetAspectRatio = targetSpecs.width / targetSpecs.height;
    const videoWidth = videoInfo.width;
    const videoHeight = videoInfo.height;

    let cropWidth, cropHeight;
    
    if (videoWidth / videoHeight > targetAspectRatio) {
      // Video is wider, crop width
      cropHeight = videoHeight;
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      // Video is taller, crop height
      cropWidth = videoWidth;
      cropHeight = cropWidth / targetAspectRatio;
    }

    return {
      x: Math.round((videoWidth - cropWidth) / 2),
      y: Math.round((videoHeight - cropHeight) / 2),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    };
  }

  /**
   * Extract frame from video for face detection
   * @param {string} videoPath - Path to video file
   * @param {number} timestamp - Timestamp in seconds
   * @param {string} outputPath - Output image path
   * @returns {Promise<string>} Path to extracted frame
   */
  async extractFrame(videoPath, timestamp, outputPath) {
    if (!this.isAvailable) {
      throw new Error('Frame extraction not available. OpenCV4nodejs not installed.');
    }

    try {
      const cap = new cv.VideoCapture(videoPath);
      const fps = cap.get(cv.CAP_PROP_FPS);
      const frameIndex = Math.floor(timestamp * fps);
      
      cap.set(cv.CAP_PROP_POS_FRAMES, frameIndex);
      const frame = cap.read();
      
      if (frame.empty) {
        throw new Error('Failed to extract frame at timestamp');
      }

      cv.imwrite(outputPath, frame);
      cap.release();
      
      return outputPath;
    } catch (error) {
      throw new Error(`Frame extraction failed: ${error.message}`);
    }
  }

  /**
   * Health check for face detection service
   * @returns {boolean} Service availability
   */
  healthCheck() {
    return this.isAvailable && this.classifier !== null;
  }

  /**
   * Get service capabilities
   * @returns {Object} Service capabilities
   */
  getCapabilities() {
    return {
      faceDetection: this.isAvailable,
      smartCropping: this.isAvailable,
      frameExtraction: this.isAvailable,
      version: this.isAvailable ? cv.version : null
    };
  }
}

module.exports = FaceDetectionService;