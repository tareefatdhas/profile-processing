const sharp = require('sharp');
const faceapi = require('@vladmandic/face-api');
const tf = require('@tensorflow/tfjs-node');
const { getConfig, mergeConfig } = require('./config');
const path = require('path');

// Initialize face-api models
let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  
  try {
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
  
  // Try to detect faces if models are loaded
  if (modelsLoaded) {
    try {
      // Convert image to buffer for face detection
      const imageBuffer = await image.jpeg().toBuffer();
      
      // Use TensorFlow.js to decode the image directly
      const tensor = tf.node.decodeImage(imageBuffer, 3); // 3 channels for RGB
      
      // Detect faces using the tensor
      const detections = await faceapi.detectAllFaces(tensor, new faceapi.TinyFaceDetectorOptions());
      
      // Dispose of the tensor to free memory
      tensor.dispose();
      
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