const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { preprocessImageFromBuffer, loadModels } = require('./image-processor');
const { presets, getConfig } = require('./config');
const Busboy = require('busboy');

// Initialize Firebase Admin
admin.initializeApp();

// Pre-load models when function starts (cold start optimization)
let modelsLoaded = false;
const initModels = async () => {
  if (!modelsLoaded) {
    await loadModels();
    modelsLoaded = true;
  }
};

// Main image processing endpoint
exports.processImage = functions
  .runWith({
    memory: '2GB',
    timeoutSeconds: 540,
  })
  .https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      // Initialize models if not already loaded
      await initModels();

      const { imageBuffer, preset, customSettings } = await parseMultipartRequest(req);

      if (!imageBuffer) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      // Validate preset
      const validPresets = Object.keys(presets);
      const selectedPreset = preset && validPresets.includes(preset) ? preset : 'default';

      console.log(`Processing image with preset: ${selectedPreset}`);

      // Process the image
      const processedBuffer = await preprocessImageFromBuffer(
        imageBuffer, 
        selectedPreset, 
        customSettings || {}
      );

      // Return processed image
      res.set('Content-Type', 'image/png');
      res.set('Content-Disposition', 'inline; filename="processed-image.png"');
      res.status(200).send(processedBuffer);

    } catch (error) {
      console.error('Error processing image:', error);
      res.status(500).json({ 
        error: 'Failed to process image', 
        details: error.message 
      });
    }
  });

// Health check endpoint
exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'image-processor',
    timestamp: new Date().toISOString(),
    availablePresets: Object.keys(presets)
  });
});

// Get available presets endpoint
exports.presets = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.status(200).send();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  // Return preset information
  const presetInfo = Object.entries(presets).map(([key, config]) => ({
    name: key,
    description: config.description || `${key} preset`,
    settings: config
  }));

  res.status(200).json({
    presets: presetInfo,
    defaultPreset: 'default'
  });
});

// Parse multipart form data to extract image and settings
async function parseMultipartRequest(req) {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: req.headers });
    let imageBuffer = null;
    let preset = 'default';
    let customSettings = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (fieldname === 'image') {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          imageBuffer = Buffer.concat(chunks);
        });
      } else {
        file.resume(); // Discard other files
      }
    });

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'preset') {
        preset = val;
      } else if (fieldname === 'customSettings') {
        try {
          customSettings = JSON.parse(val);
        } catch (e) {
          console.warn('Invalid customSettings JSON:', e.message);
        }
      }
    });

    busboy.on('finish', () => {
      resolve({ imageBuffer, preset, customSettings });
    });

    busboy.on('error', reject);

    req.pipe(busboy);
  });
} 