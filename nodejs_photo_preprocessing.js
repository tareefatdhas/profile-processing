const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp();

const storage = new Storage();

/**
 * Firebase Function to preprocess photos for avatar generation
 * Triggered when a photo is uploaded to the 'user-photos' bucket
 */
exports.preprocessAvatarPhoto = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  // Only process images in the user-photos folder
  if (!filePath.startsWith('user-photos/') || !contentType.startsWith('image/')) {
    console.log('Not a user photo or not an image, skipping...');
    return null;
  }

  const bucket = storage.bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
  const processedFilePath = filePath.replace('user-photos/', 'processed-photos/');

  try {
    // Download the file to local temp directory
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('Image downloaded locally to', tempFilePath);

    // Process the image
    const processedBuffer = await preprocessImage(tempFilePath);

    // Upload the processed image
    await bucket.file(processedFilePath).save(processedBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          processed: 'true',
          processedAt: new Date().toISOString()
        }
      }
    });

    console.log('Processed image uploaded to', processedFilePath);

    // Clean up local files
    fs.unlinkSync(tempFilePath);

    return { success: true, processedPath: processedFilePath };

  } catch (error) {
    console.error('Error processing image:', error);
    // Clean up on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw error;
  }
});

/**
 * HTTP Function for direct image processing
 */
exports.processAvatarImage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { imagePath } = data;
  
  if (!imagePath) {
    throw new functions.https.HttpsError('invalid-argument', 'imagePath is required');
  }

  try {
    const bucket = storage.bucket();
    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}.jpg`);
    
    // Download the image
    await bucket.file(imagePath).download({ destination: tempFilePath });
    
    // Process the image
    const processedBuffer = await preprocessImage(tempFilePath);
    
    // Upload processed image
    const processedPath = imagePath.replace('user-photos/', 'processed-photos/').replace(/\.[^/.]+$/, '.png');
    await bucket.file(processedPath).save(processedBuffer, {
      metadata: { contentType: 'image/png' }
    });

    // Clean up
    fs.unlinkSync(tempFilePath);

    return { success: true, processedPath };

  } catch (error) {
    console.error('Error in processAvatarImage:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process image');
  }
});

/**
 * Main image preprocessing function for file paths
 */
async function preprocessImage(inputPath) {
  try {
    // Load image with Sharp
    let image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log('Processing image:', metadata.width, 'x', metadata.height);

    // Step 1: Smart crop to focus on face/upper body
    const croppedBuffer = await smartCropImage(image, metadata);
    
    // Step 2: Color correction and skin tone optimization
    const colorCorrectedBuffer = await colorCorrectForAvatars(croppedBuffer);
    
    // Step 3: Final adjustments
    const finalBuffer = await finalAdjustments(colorCorrectedBuffer);
    
    return finalBuffer;

  } catch (error) {
    console.error('Error in preprocessImage:', error);
    throw error;
  }
}

/**
 * Main image preprocessing function for buffers
 */
async function preprocessImageFromBuffer(inputBuffer) {
  try {
    // Load image with Sharp from buffer
    let image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    console.log('Processing image:', metadata.width, 'x', metadata.height);

    // Step 1: Smart crop to focus on face/upper body
    const croppedBuffer = await smartCropImage(image, metadata);
    
    // Step 2: Color correction and skin tone optimization
    const colorCorrectedBuffer = await colorCorrectForAvatars(croppedBuffer);
    
    // Step 3: Final adjustments
    const finalBuffer = await finalAdjustments(colorCorrectedBuffer);
    
    return finalBuffer;

  } catch (error) {
    console.error('Error in preprocessImageFromBuffer:', error);
    throw error;
  }
}

/**
 * Smart cropping focused on upper body/portrait
 */
async function smartCropImage(image, metadata) {
  const { width, height } = metadata;
  
  // Create a portrait-oriented crop
  const targetAspectRatio = 1; // Square for avatar
  const minSize = Math.min(width, height);
  
  // Crop from center-top area (better for portraits)
  const cropWidth = minSize;
  const cropHeight = minSize;
  const left = Math.max(0, Math.floor((width - cropWidth) / 2));
  const top = Math.max(0, Math.floor(height * 0.1)); // Start from 10% down
  
  return await image
    .extract({ 
      left: left, 
      top: top, 
      width: Math.min(cropWidth, width - left), 
      height: Math.min(cropHeight, height - top)
    })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toBuffer();
}

/**
 * Color correction optimized for avatar generation
 */
async function colorCorrectForAvatars(imageBuffer) {
  let image = sharp(imageBuffer);
  
  // Get image statistics for analysis
  const stats = await image.stats();
  
  // Analyze if this appears to be light skin that might get darkened
  const avgLuminance = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
  const isLightToned = avgLuminance > 140;
  const needsBrightening = avgLuminance < 170;
  
  // Base color corrections
  let processing = image
    .modulate({
      brightness: calculateBrightnessAdjustment(avgLuminance, isLightToned),
      saturation: 1.05, // Slight saturation boost
      hue: 0
    });

  // White balance correction using gamma
  if (isLightToned && needsBrightening) {
    // Protect light skin from getting darker
    processing = processing
      .gamma(0.9) // Slight brightening gamma
      .linear(1.1, 0); // Linear adjustment to lift shadows
  }
  
  // Remove color casts that make skin look tanned
  processing = processing
    .tint({ r: 255, g: 250, b: 245 }) // Very subtle warm white balance
    .normalise(); // Normalize contrast
  
  return await processing.png().toBuffer();
}

/**
 * Calculate appropriate brightness adjustment based on skin tone analysis
 */
function calculateBrightnessAdjustment(avgLuminance, isLightToned) {
  if (isLightToned) {
    // Light skin tones - prevent darkening, slight brightening bias
    if (avgLuminance > 180) return 0.98; // Very light - tiny reduction to prevent overexposure
    if (avgLuminance > 160) return 1.02; // Light - slight boost
    return 1.08; // Light but dim - more significant boost
  } else if (avgLuminance > 120) {
    // Medium skin tones
    return 1.03; // Gentle boost
  } else {
    // Darker skin tones
    return 1.05; // Slight boost without overexposure
  }
}

/**
 * Final adjustments for avatar-ready output
 */
async function finalAdjustments(imageBuffer) {
  return await sharp(imageBuffer)
    .sharpen(1.2) // Slight sharpening for crisp details
    .modulate({
      brightness: 1.0,
      saturation: 1.02, // Final subtle saturation
      hue: 0
    })
    .png({
      quality: 95,
      compressionLevel: 6,
      adaptiveFiltering: true
    })
    .toBuffer();
}

/**
 * Utility function to process a single image (for testing)
 */
exports.processSingleImage = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      res.status(400).json({ error: 'imageUrl is required' });
      return;
    }

    // Download image from URL using node-fetch
    const fetch = require('node-fetch');
    const response = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Process the image - need to pass buffer directly
    const processedBuffer = await preprocessImageFromBuffer(imageBuffer);
    
    // Return processed image as base64
    const base64 = processedBuffer.toString('base64');
    
    res.json({
      success: true,
      processedImage: `data:image/png;base64,${base64}`,
      size: processedBuffer.length
    });

  } catch (error) {
    console.error('Error processing single image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Package.json dependencies needed:
/*
{
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0",
    "@google-cloud/storage": "^6.0.0",
    "sharp": "^0.32.0",
    "node-fetch": "^2.7.0"
  }
}
*/