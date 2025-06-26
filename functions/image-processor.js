const sharp = require('sharp');
const tf = require('@tensorflow/tfjs');
const wasm = require('@tensorflow/tfjs-backend-wasm');
// Use the WASM-compatible version of face-api
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const { getConfig, mergeConfig } = require('./config');
const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');

// Patch the environment for face-api to work with canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Initialize TensorFlow with WASM backend for serverless compatibility
let tensorflowInitialized = false;

async function initializeTensorFlow() {
  if (tensorflowInitialized) return;
  
  try {
    // Set WASM path for TensorFlow
    wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/');
    
    // Set backend to WASM
    await tf.setBackend('wasm');
    await tf.ready();
    
    tensorflowInitialized = true;
    console.log('✅ TensorFlow WASM backend initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize TensorFlow WASM backend:', error.message);
  }
}

// Initialize face-api models
let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  
  try {
    // Initialize TensorFlow first
    await initializeTensorFlow();
    
    const modelPath = path.join(__dirname, 'models');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    modelsLoaded = true;
    console.log('✅ Face detection models loaded');
  } catch (error) {
    console.warn('⚠️ Could not load face detection models:', error.message);
    console.warn('Falling back to heuristic positioning');
  }
}

/**
 * Main image preprocessing function for buffers (optimized for Firebase Functions)
 */
async function preprocessImageFromBuffer(inputBuffer, preset = 'default', customSettings = {}) {
  try {
    const config = mergeConfig(preset, customSettings);
    
    // Load image with Sharp from buffer
    let image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    console.log('Processing image:', metadata.width, 'x', metadata.height);
    console.log('Using preset:', preset);

    // Step 1: Smart crop to focus on face/upper body
    const croppedBuffer = await smartCropImage(image, metadata, config);
    
    // Step 2: Color correction and skin tone optimization
    const colorCorrectedBuffer = await colorCorrectForAvatars(croppedBuffer, config);
    
    // Step 3: Final adjustments
    const finalBuffer = await finalAdjustments(colorCorrectedBuffer, config);
    
    return finalBuffer;

  } catch (error) {
    console.error('Error in preprocessImageFromBuffer:', error);
    throw error;
  }
}

/**
 * Advanced face-focused cropping for avatars using facial detection
 */
async function smartCropImage(image, metadata, config) {
  const { width, height } = metadata;
  
  console.log(`Original image: ${width}x${height}, aspect ratio: ${(width/height).toFixed(2)}`);
  
  let faceCenter = null;
  let faceBox = null;
  
  // Try to detect faces if models are loaded
  if (modelsLoaded) {
    try {
      // Convert image to JPEG buffer for face detection
      const imageBuffer = await image.jpeg().toBuffer();
      
      // Create canvas from image buffer for face-api.js
      const img = new Image();
      img.src = imageBuffer;
      const canvas = new Canvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Detect faces using the canvas
      const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5
      }));
      
      if (detections.length > 0) {
        // Use the largest face (most prominent)
        const largestFace = detections.reduce((prev, current) => 
          (prev.box.area > current.box.area) ? prev : current
        );
        
        const box = largestFace.box;
        faceBox = box;
        faceCenter = {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2
        };
        
        console.log(`✅ Face detected at (${Math.round(faceCenter.x)}, ${Math.round(faceCenter.y)})`);
      } else {
        console.log('ℹ️ No faces detected, using heuristic positioning');
      }
    } catch (error) {
      console.warn('⚠️ Face detection failed:', error.message);
      console.warn('Falling back to heuristic positioning');
    }
  }
  
  // Check if image is already tightly cropped (if tight crop detection is enabled)
  let isAlreadyTight = false;
  if (config.cropping.tightCropDetection?.enabled && faceCenter && faceBox) {
    const imageArea = width * height;
    const faceArea = faceBox.width * faceBox.height;
    const faceToImageRatio = faceArea / imageArea;
    
    // Calculate distance from face to edges (normalized)
    const minDistanceToEdge = Math.min(
      faceCenter.x / width,                    // Distance to left edge
      (width - faceCenter.x) / width,         // Distance to right edge  
      faceCenter.y / height,                  // Distance to top edge
      (height - faceCenter.y) / height       // Distance to bottom edge
    );
    
    // Consider image tight if face takes up significant portion AND is close to edges
    isAlreadyTight = faceToImageRatio > (config.cropping.tightCropDetection.faceToImageRatioThreshold || 0.25) ||
                     minDistanceToEdge < (config.cropping.tightCropDetection.faceEdgeDistanceThreshold || 0.15);
    
    if (isAlreadyTight) {
      console.log(`🔍 Tight crop detected - Face ratio: ${(faceToImageRatio * 100).toFixed(1)}%, Min edge distance: ${(minDistanceToEdge * 100).toFixed(1)}%`);
    }
  }
  
  // Determine crop parameters using config and tight crop detection
  let cropWidth, cropHeight;
  let cropSizeMultiplier;
  
  if (isAlreadyTight) {
    // Use loose crop or skip cropping for already tight images
    cropSizeMultiplier = config.cropping.tightCropDetection?.looseCropSize || 0.95;
    console.log(`📏 Using loose crop size: ${cropSizeMultiplier} (image already tight)`);
  } else if (faceCenter) {
    cropSizeMultiplier = config.cropping.faceDetectedSize;
  } else {
    cropSizeMultiplier = config.cropping.fallbackSize;
  }
  
  const squareSize = Math.min(width, height) * cropSizeMultiplier;
  cropWidth = Math.floor(squareSize);
  cropHeight = Math.floor(squareSize);
  
  let left, top;
  
  if (faceCenter) {
    // Center crop around detected face
    left = Math.floor(faceCenter.x - cropWidth / 2);
    top = Math.floor(faceCenter.y - cropHeight / 2);
    
    // Apply vertical offset from config
    top = Math.floor(top + cropHeight * config.cropping.faceVerticalOffset);
  } else {
    // Fallback to heuristic positioning using config values
    const aspectRatio = width / height;
    left = Math.floor((width - cropWidth) / 2);
    
    if (aspectRatio > config.cropping.landscapeThreshold) {
      // Landscape - use config value for landscape positioning
      top = Math.floor(height * config.cropping.fallbackLandscapeTop);
    } else {
      // Portrait - use config value for portrait positioning
      top = Math.floor(height * config.cropping.fallbackPortraitTop);
    }
  }
  
  // Ensure crop stays within image boundaries
  left = Math.max(0, Math.min(left, width - cropWidth));
  top = Math.max(0, Math.min(top, height - cropHeight));
  
  // Adjust crop size if needed to fit within boundaries
  const actualCropWidth = Math.min(cropWidth, width - left);
  const actualCropHeight = Math.min(cropHeight, height - top);
  
  console.log(`Smart crop: ${actualCropWidth}x${actualCropHeight} at (${left}, ${top})`);
  
  return await image
    .extract({ 
      left: left, 
      top: top, 
      width: actualCropWidth, 
      height: actualCropHeight
    })
    .resize(config.output.size, config.output.size, { 
      fit: 'cover', 
      position: 'centre'
    })
    .png()
    .toBuffer();
}

/**
 * Enhanced color correction optimized for portrait avatars with configurable settings
 */
async function colorCorrectForAvatars(imageBuffer, config) {
  const image = sharp(imageBuffer);
  
  return await image
    .modulate({
      brightness: config.brightness.base,
      saturation: config.color.saturation,
      hue: config.color.hue
    })
    .linear(config.contrast.linearMultiplier, config.contrast.linearOffset)
    .gamma(config.contrast.gamma)
    .png()
    .toBuffer();
}

/**
 * Final adjustments including sharpening and any additional processing
 */
async function finalAdjustments(imageBuffer, config) {
  const image = sharp(imageBuffer);
  
  let processedImage = image;
  
  // Apply sharpening if configured
  if (config.sharpening && config.sharpening.sigma) {
    processedImage = processedImage.sharpen({
      sigma: config.sharpening.sigma,
      flat: config.sharpening.flat,
      jagged: config.sharpening.jagged
    });
  }
  
  // Apply final brightness adjustment
  if (config.brightness.final && config.brightness.final !== 1.0) {
    processedImage = processedImage.modulate({
      brightness: config.brightness.final
    });
  }
  
  // Apply final saturation adjustment
  if (config.color.finalSaturation && config.color.finalSaturation !== 1.0) {
    processedImage = processedImage.modulate({
      saturation: config.color.finalSaturation
    });
  }
  
  return await processedImage
    .png({ 
      quality: config.output.quality,
      compressionLevel: config.output.compressionLevel
    })
    .toBuffer();
}

module.exports = {
  preprocessImageFromBuffer,
  loadModels
}; 