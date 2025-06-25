const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { preprocessImageFromBuffer, loadModels } = require('./functions/image-processor');
const { presets } = require('./functions/config');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Global variable to track model loading status
let modelsLoaded = false;
let modelLoadingPromise = null;

// Initialize models on startup
async function initializeModels() {
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }
  
  modelLoadingPromise = loadModels().then(() => {
    modelsLoaded = true;
    console.log('✅ Models loaded successfully');
    return true;
  }).catch(err => {
    console.error('❌ Failed to load models:', err);
    console.log('⚠️ Service will continue with fallback image processing');
    modelsLoaded = false;
    return false;
  });
  
  return modelLoadingPromise;
}

// Start model loading immediately
initializeModels();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'image-processor-cloudrun',
    timestamp: new Date().toISOString(),
    modelsLoaded: modelsLoaded,
    availablePresets: Object.keys(presets),
    version: '1.0.0'
  });
});

// Get available presets
app.get('/presets', (req, res) => {
  const presetInfo = Object.entries(presets).map(([key, config]) => ({
    name: key,
    description: config.description || `${key} preset`,
    settings: config
  }));

  res.json({
    presets: presetInfo,
    defaultPreset: 'default',
    modelsLoaded: modelsLoaded
  });
});

// Main image processing endpoint
app.post('/process', upload.single('image'), async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image provided',
        message: 'Please upload an image file using the "image" field'
      });
    }

    // Wait for models to load if they're still loading
    if (!modelsLoaded && modelLoadingPromise) {
      console.log('⏳ Waiting for models to load...');
      await modelLoadingPromise;
    }

    // Get processing parameters
    const preset = req.body.preset || 'default';
    let customSettings = {};
    
    if (req.body.customSettings) {
      try {
        customSettings = JSON.parse(req.body.customSettings);
      } catch (e) {
        console.warn('Invalid customSettings JSON:', e.message);
      }
    }

    // Validate preset
    const validPresets = Object.keys(presets);
    const selectedPreset = validPresets.includes(preset) ? preset : 'default';

    console.log(`🖼️  Processing ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB) with preset: ${selectedPreset}`);

    // Process the image
    const startTime = Date.now();
    const processedBuffer = await preprocessImageFromBuffer(
      req.file.buffer, 
      selectedPreset, 
      customSettings
    );
    const processingTime = Date.now() - startTime;

    console.log(`✅ Image processed in ${processingTime}ms`);

    // Return processed image
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'inline; filename="processed-image.png"');
    res.set('X-Processing-Time', processingTime.toString());
    res.set('X-Preset-Used', selectedPreset);
    res.send(processedBuffer);

  } catch (error) {
    console.error('❌ Error processing image:', error);
    
    // Return detailed error for debugging
    res.status(500).json({ 
      error: 'Failed to process image', 
      message: error.message,
      preset: req.body.preset || 'default',
      fileSize: req.file ? req.file.size : 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Process image with URL (bonus endpoint)
app.post('/process-url', express.json(), async (req, res) => {
  try {
    const { imageUrl, preset = 'default', customSettings = {} } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'No imageUrl provided' });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch image from URL' });
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Wait for models to load if needed
    if (!modelsLoaded && modelLoadingPromise) {
      await modelLoadingPromise;
    }

    console.log(`🌐 Processing image from URL with preset: ${preset}`);

    const processedBuffer = await preprocessImageFromBuffer(
      imageBuffer, 
      preset, 
      customSettings
    );

    res.set('Content-Type', 'image/png');
    res.send(processedBuffer);

  } catch (error) {
    console.error('❌ Error processing image from URL:', error);
    res.status(500).json({ 
      error: 'Failed to process image from URL', 
      message: error.message 
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    availableEndpoints: {
      'GET /health': 'Health check',
      'GET /presets': 'Get available presets',
      'POST /process': 'Process image (multipart/form-data)',
      'POST /process-url': 'Process image from URL (JSON)'
    }
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Image Processing Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎨 Available presets: ${Object.keys(presets).join(', ')}`);
});

module.exports = app; 