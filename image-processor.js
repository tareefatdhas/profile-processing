const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');
const wasm = require('@tensorflow/tfjs-backend-wasm');
// Use the WASM-compatible version of face-api
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const { Canvas, Image, ImageData } = require('canvas');
const { getConfig, mergeConfig } = require('./config');

// Patch the environment for face-api to work with canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Initialize TensorFlow with WASM backend for compatibility
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
 * Main image preprocessing function for file paths
 */
async function preprocessImage(inputPath, preset = 'default', customSettings = {}) {
  try {
    const config = mergeConfig(preset, customSettings);
    
    // Load image with Sharp
    let image = sharp(inputPath);
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
    console.error('Error in preprocessImage:', error);
    throw error;
  }
}

/**
 * Main image preprocessing function for buffers
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
  
  // Load face detection models if not already loaded
  await loadModels();
  
  let faceCenter = null;
  
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
  
  // Determine crop parameters using config
  let cropWidth, cropHeight;
  
  if (faceCenter) {
    const squareSize = Math.min(width, height) * config.cropping.faceDetectedSize; 
    cropWidth = Math.floor(squareSize);
    cropHeight = Math.floor(squareSize);
  } else {
    const squareSize = Math.min(width, height) * config.cropping.fallbackSize;
    cropWidth = Math.floor(squareSize);
    cropHeight = Math.floor(squareSize);
  }
  
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
  let image = sharp(imageBuffer);
  
  // Get basic image statistics for adaptive processing
  const stats = await image.stats();
  const avgLuminance = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
  
  // Adaptive brightness adjustment based on config
  let brightnessAdjustment = config.brightness.base;
  if (avgLuminance < config.brightness.darkThreshold) {
    brightnessAdjustment = config.brightness.darkImages;
  } else if (avgLuminance < config.brightness.mediumThreshold) {
    brightnessAdjustment = config.brightness.mediumDarkImages;
  } else if (avgLuminance > config.brightness.brightThreshold) {
    brightnessAdjustment = config.brightness.brightImages;
  }
  
  console.log(`💡 Brightness adjustment: ${brightnessAdjustment}x (avg luminance: ${Math.round(avgLuminance)})`);
  console.log(`🎛️ Brightness config:`, {
    base: config.brightness.base,
    darkImages: config.brightness.darkImages,
    mediumDarkImages: config.brightness.mediumDarkImages,
    brightImages: config.brightness.brightImages
  });
  
  // Enhanced color processing using config
  return await image
    .modulate({
      brightness: brightnessAdjustment,
      saturation: config.color.saturation,
      hue: config.color.hue
    })
    .gamma(config.contrast.gamma)
    .linear(config.contrast.linearMultiplier, config.contrast.linearOffset)
    .png()
    .toBuffer();
}

/**
 * Final adjustments for avatar-ready output with configurable settings
 */
async function finalAdjustments(imageBuffer, config) {
  return await sharp(imageBuffer)
    .sharpen({ 
      sigma: config.sharpening.sigma,
      flat: config.sharpening.flat, 
      jagged: config.sharpening.jagged
    })
    .modulate({
      brightness: config.brightness.final,
      saturation: config.color.finalSaturation,
      hue: 0
    })
    .png({
      quality: config.output.quality,
      compressionLevel: config.output.compressionLevel,
      adaptiveFiltering: true,
      progressive: true
    })
    .toBuffer();
}

/**
 * Process image file and save to output path
 */
async function processImageFile(inputPath, outputPath, preset = 'default', customSettings = {}) {
  try {
    const processedBuffer = await preprocessImage(inputPath, preset, customSettings);
    await fs.promises.writeFile(outputPath, processedBuffer);
    console.log(`Processed image saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error processing image file:', error);
    throw error;
  }
}

module.exports = {
  preprocessImage,
  preprocessImageFromBuffer,
  loadModels,
  processImageFile,
  smartCropImage,
  colorCorrectForAvatars,
  finalAdjustments
}; 