const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { preprocessImageFromBuffer, loadModels } = require('./image-processor');
const { presets, getConfig } = require('./config');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Create uploads and output directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Serve static files
app.use(express.static('public'));
app.use('/output', express.static(outputDir));

// Serve the main page with enhanced controls
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Advanced Image Processor</title>
        <style>
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f7;
                color: #1d1d1f;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
            }
            
            .content {
                padding: 30px;
            }
            
            .upload-section {
                margin-bottom: 30px;
            }
            
            .upload-area {
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                padding: 40px 20px;
                text-align: center;
                transition: all 0.3s ease;
                background: #f9fafb;
            }
            
            .upload-area:hover, .upload-area.dragover {
                border-color: #667eea;
                background-color: #f0f4ff;
            }
            
            .upload-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 28px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: transform 0.2s ease;
            }
            
            .upload-btn:hover {
                transform: translateY(-2px);
            }
            
            input[type="file"] {
                display: none;
            }
            
            .controls-section {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            
            .presets-panel {
                background: #f9fafb;
                padding: 20px;
                border-radius: 12px;
            }
            
            .presets-panel h3 {
                margin: 0 0 15px 0;
                color: #374151;
                font-size: 18px;
            }
            
            .preset-btn {
                display: block;
                width: 100%;
                margin-bottom: 10px;
                padding: 12px 16px;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                font-size: 14px;
            }
            
            .preset-btn:hover {
                border-color: #667eea;
                background: #f0f4ff;
            }
            
            .preset-btn.active {
                border-color: #667eea;
                background: #667eea;
                color: white;
            }
            
            .preset-btn strong {
                display: block;
                margin-bottom: 4px;
            }
            
            .custom-controls {
                background: #f9fafb;
                padding: 20px;
                border-radius: 12px;
            }
            
            .custom-controls h3 {
                margin: 0 0 20px 0;
                color: #374151;
                font-size: 18px;
            }
            
            .control-group {
                margin-bottom: 20px;
            }
            
            .control-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
            }
            
            .slider-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .slider {
                flex: 1;
                height: 6px;
                border-radius: 3px;
                background: #e5e7eb;
                outline: none;
                -webkit-appearance: none;
            }
            
            .slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }
            
            .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }
            
            .slider-value {
                min-width: 50px;
                text-align: center;
                font-weight: 500;
                color: #667eea;
                font-size: 14px;
            }
            
            .process-btn {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 16px 32px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                width: 100%;
                margin-bottom: 20px;
                transition: transform 0.2s ease;
            }
            
            .process-btn:hover:not(:disabled) {
                transform: translateY(-2px);
            }
            
            .process-btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }
            
            .preview-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }
            
            .preview-box {
                background: #f9fafb;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }
            
            .preview-box h4 {
                margin: 0 0 15px 0;
                color: #374151;
                font-size: 16px;
            }
            
            .preview-image {
                max-width: 100%;
                max-height: 400px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .file-info {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                font-size: 14px;
                color: #0c4a6e;
            }
            
            .message {
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                font-size: 14px;
            }
            
            .message.error {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
            }
            
            .message.success {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                color: #166534;
            }
            
            .message.loading {
                background: #fffbeb;
                border: 1px solid #fed7aa;
                color: #ea580c;
            }
            
            @media (max-width: 768px) {
                .controls-section {
                    grid-template-columns: 1fr;
                }
                
                .preview-container {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎨 Advanced Image Processor</h1>
                <p>Professional avatar processing with customizable settings</p>
            </div>
            
            <div class="content">
                <div class="upload-section">
                    <div class="upload-area" id="uploadArea">
                        <p style="margin: 0 0 15px 0; font-size: 16px; color: #6b7280;">📁 Drag and drop an image here or click to select</p>
                        <button class="upload-btn" onclick="document.getElementById('fileInput').click()">
                            Choose Image
                        </button>
                        <input type="file" id="fileInput" accept="image/*" onchange="handleFileSelect(event)">
                    </div>
                    
                    <div id="fileInfo" class="file-info" style="display: none;"></div>
                </div>
                
                <div class="controls-section">
                    <div class="presets-panel">
                        <h3>Quick Presets</h3>
                        <button class="preset-btn active" data-preset="default">
                            <strong>Default</strong>
                            <span>Balanced processing for most photos</span>
                        </button>
                        <button class="preset-btn" data-preset="brighten">
                            <strong>Brighten</strong>
                            <span>For dark or underexposed photos</span>
                        </button>
                        <button class="preset-btn" data-preset="subtle">
                            <strong>Subtle</strong>
                            <span>Light processing for well-lit photos</span>
                        </button>
                        <button class="preset-btn" data-preset="vibrant">
                            <strong>Vibrant</strong>
                            <span>High contrast and vivid colors</span>
                        </button>
                        <button class="preset-btn" data-preset="natural">
                            <strong>Natural</strong>
                            <span>Soft and natural appearance</span>
                        </button>
                    </div>
                    
                    <div class="custom-controls">
                        <h3>Custom Adjustments</h3>
                        
                                                 <div class="control-group">
                             <label>Brightness</label>
                             <div class="slider-container">
                                 <input type="range" class="slider" id="brightness" min="0.8" max="1.4" step="0.05" value="1.15">
                                 <span class="slider-value" id="brightnessValue">1.15</span>
                             </div>
                         </div>
                         
                         <div class="control-group">
                             <label>Saturation</label>
                             <div class="slider-container">
                                 <input type="range" class="slider" id="saturation" min="0.8" max="1.5" step="0.05" value="0.9">
                                 <span class="slider-value" id="saturationValue">0.9</span>
                             </div>
                         </div>
                         
                         <div class="control-group">
                             <label>Contrast (Gamma)</label>
                             <div class="slider-container">
                                 <input type="range" class="slider" id="gamma" min="0.8" max="1.8" step="0.05" value="1.1">
                                 <span class="slider-value" id="gammaValue">1.1</span>
                             </div>
                         </div>
                         
                         <div class="control-group">
                             <label>Sharpening</label>
                             <div class="slider-container">
                                 <input type="range" class="slider" id="sharpening" min="0.5" max="2.5" step="0.1" value="0.9">
                                 <span class="slider-value" id="sharpeningValue">0.9</span>
                             </div>
                         </div>
                         
                         <div class="control-group">
                             <label>Crop Size</label>
                             <div class="slider-container">
                                 <input type="range" class="slider" id="cropSize" min="0.5" max="1.0" step="0.05" value="0.65">
                                 <span class="slider-value" id="cropSizeValue">0.65</span>
                             </div>
                         </div>
                    </div>
                </div>
                
                <button class="process-btn" id="processBtn" onclick="processImage()" disabled>
                    🔄 Process Image
                </button>
                
                <div id="result"></div>
                
                <div class="preview-container" id="previewContainer" style="display: none;">
                    <div class="preview-box">
                        <h4>Original Image</h4>
                        <img id="originalImage" class="preview-image">
                    </div>
                    <div class="preview-box">
                        <h4>Processed Image</h4>
                        <img id="processedImage" class="preview-image">
                    </div>
                </div>
            </div>
        </div>

        <script>
            let selectedFile = null;
            let currentPreset = 'default';
            
            // Preset configurations (matching server-side)
            const presetConfigs = {
                default: { brightness: { base: 1.15 }, color: { saturation: 0.9 }, contrast: { gamma: 1.1 }, sharpening: { sigma: 0.9 }, cropping: { faceDetectedSize: 0.65 } },
                brighten: { brightness: { base: 1.20 }, color: { saturation: 1.10 }, contrast: { gamma: 1.25 }, sharpening: { sigma: 1.2 }, cropping: { faceDetectedSize: 0.6 } },
                subtle: { brightness: { base: 1.05 }, color: { saturation: 1.05 }, contrast: { gamma: 1.17 }, sharpening: { sigma: 1.2 }, cropping: { faceDetectedSize: 0.6 } },
                vibrant: { brightness: { base: 1.15 }, color: { saturation: 1.20 }, contrast: { gamma: 1.30 }, sharpening: { sigma: 1.5 }, cropping: { faceDetectedSize: 0.6 } },
                natural: { brightness: { base: 1.08 }, color: { saturation: 1.08 }, contrast: { gamma: 1.10 }, sharpening: { sigma: 0.8 }, cropping: { faceDetectedSize: 0.6 } }
            };

            // Initialize controls
            document.addEventListener('DOMContentLoaded', function() {
                // Preset buttons
                document.querySelectorAll('.preset-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        currentPreset = this.dataset.preset;
                        updateControlsFromPreset(currentPreset);
                    });
                });
                
                // Slider controls
                ['brightness', 'saturation', 'gamma', 'sharpening', 'cropSize'].forEach(id => {
                    const slider = document.getElementById(id);
                    const valueSpan = document.getElementById(id + 'Value');
                    
                    slider.addEventListener('input', function() {
                        valueSpan.textContent = this.value;
                    });
                });
                
                // Drag and drop
                const uploadArea = document.getElementById('uploadArea');
                
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        handleFile(files[0]);
                    }
                });
            });
            
            function updateControlsFromPreset(presetName) {
                const config = presetConfigs[presetName];
                if (!config) return;
                
                if (config.brightness?.base) {
                    document.getElementById('brightness').value = config.brightness.base;
                    document.getElementById('brightnessValue').textContent = config.brightness.base;
                }
                if (config.color?.saturation) {
                    document.getElementById('saturation').value = config.color.saturation;
                    document.getElementById('saturationValue').textContent = config.color.saturation;
                }
                if (config.contrast?.gamma) {
                    document.getElementById('gamma').value = config.contrast.gamma;
                    document.getElementById('gammaValue').textContent = config.contrast.gamma;
                }
                if (config.sharpening?.sigma) {
                    document.getElementById('sharpening').value = config.sharpening.sigma;
                    document.getElementById('sharpeningValue').textContent = config.sharpening.sigma;
                }
                if (config.cropping?.faceDetectedSize) {
                    document.getElementById('cropSize').value = config.cropping.faceDetectedSize;
                    document.getElementById('cropSizeValue').textContent = config.cropping.faceDetectedSize;
                }
            }

            function handleFileSelect(event) {
                const file = event.target.files[0];
                if (file) {
                    handleFile(file);
                }
            }

            function handleFile(file) {
                if (!file.type.startsWith('image/')) {
                    showMessage('Please select a valid image file.', 'error');
                    return;
                }

                selectedFile = file;
                
                // Show file info
                const fileInfo = document.getElementById('fileInfo');
                fileInfo.innerHTML = \`
                    <strong>Selected:</strong> \${file.name}<br>
                    <strong>Size:</strong> \${(file.size / 1024 / 1024).toFixed(2)} MB<br>
                    <strong>Type:</strong> \${file.type}
                \`;
                fileInfo.style.display = 'block';
                
                // Enable process button
                document.getElementById('processBtn').disabled = false;
                
                // Show original image preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('originalImage').src = e.target.result;
                    document.getElementById('previewContainer').style.display = 'grid';
                };
                reader.readAsDataURL(file);
                
                // Clear previous results
                document.getElementById('result').innerHTML = '';
                document.getElementById('processedImage').src = '';
            }

            async function processImage() {
                if (!selectedFile) {
                    showMessage('Please select an image first.', 'error');
                    return;
                }

                const processBtn = document.getElementById('processBtn');
                processBtn.disabled = true;
                processBtn.textContent = '⏳ Processing...';
                
                showMessage('Processing your image with custom settings...', 'loading');

                try {
                    const formData = new FormData();
                    formData.append('image', selectedFile);
                    
                    // Get custom settings from controls
                    const brightnessValue = parseFloat(document.getElementById('brightness').value);
                    const customSettings = {
                        brightness: {
                            base: brightnessValue,
                            // Override adaptive brightness to use the slider value consistently
                            darkImages: brightnessValue,
                            mediumDarkImages: brightnessValue,
                            brightImages: brightnessValue
                        },
                        color: {
                            saturation: parseFloat(document.getElementById('saturation').value)
                        },
                        contrast: {
                            gamma: parseFloat(document.getElementById('gamma').value)
                        },
                        sharpening: {
                            sigma: parseFloat(document.getElementById('sharpening').value)
                        },
                        cropping: {
                            faceDetectedSize: parseFloat(document.getElementById('cropSize').value)
                        }
                    };
                    
                    formData.append('preset', currentPreset);
                    formData.append('customSettings', JSON.stringify(customSettings));

                    const response = await fetch('/process', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        showMessage(\`Image processed successfully! Processing time: \${result.processingTime}ms\`, 'success');
                        
                        // Show processed image
                        const processedImg = document.getElementById('processedImage');
                        processedImg.src = result.processedImage;
                        
                        // Log the settings that were used for debugging
                        console.log('Processed with settings:', {
                            preset: result.preset,
                            customSettings: result.customSettings
                        });
                        
                    } else {
                        showMessage(result.error || 'Failed to process image', 'error');
                    }

                } catch (error) {
                    console.error('Error:', error);
                    showMessage('An error occurred while processing the image: ' + error.message, 'error');
                } finally {
                    processBtn.disabled = false;
                    processBtn.textContent = '🔄 Process Image';
                }
            }

            function showMessage(message, type) {
                document.getElementById('result').innerHTML = \`
                    <div class="message \${type}">\${message}</div>
                \`;
            }
        </script>
    </body>
    </html>
  `);
});

// Enhanced image processing endpoint with custom settings
app.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const preset = req.body.preset || 'default';
    let customSettings = {};
    
    try {
      if (req.body.customSettings) {
        customSettings = JSON.parse(req.body.customSettings);
      }
    } catch (e) {
      console.warn('Invalid custom settings JSON, using defaults');
    }

    console.log('Processing image:', req.file.originalname, `(${req.file.size} bytes)`);
    console.log('Using preset:', preset);
    console.log('Custom settings:', customSettings);
    
    const startTime = Date.now();
    
    // Process the image with custom settings
    const processedBuffer = await preprocessImageFromBuffer(req.file.buffer, preset, customSettings);
    
    const processingTime = Date.now() - startTime;
    console.log(`Image processed in ${processingTime}ms`);
    
    // Convert to base64 for display
    const base64 = processedBuffer.toString('base64');
    
    // Optionally save to output directory
    const outputFilename = `processed_${Date.now()}.png`;
    const outputPath = path.join(outputDir, outputFilename);
    await fs.promises.writeFile(outputPath, processedBuffer);
    
    res.json({
      success: true,
      processedImage: `data:image/png;base64,${base64}`,
      originalSize: req.file.size,
      processedSize: processedBuffer.length,
      processingTime: processingTime,
      outputPath: `/output/${outputFilename}`,
      preset: preset,
      customSettings: customSettings
    });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Failed to process image: ' + error.message 
    });
  }
});

// API endpoint to get available presets
app.get('/api/presets', (req, res) => {
  const presetList = Object.keys(presets).map(key => ({
    name: key,
    config: presets[key]
  }));
  
  res.json({
    success: true,
    presets: presetList
  });
});

// API endpoint to get a specific preset configuration
app.get('/api/presets/:name', (req, res) => {
  const presetName = req.params.name;
  const config = getConfig(presetName);
  
  if (config) {
    res.json({
      success: true,
      preset: presetName,
      config: config
    });
  } else {
    res.status(404).json({
      error: 'Preset not found'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(port, async () => {
  console.log(`\n🚀 Advanced Image Processor Server running at http://localhost:${port}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`\n🔗 Open http://localhost:${port} in your browser to test the image processor`);
  console.log(`\n🎛️ Available presets: ${Object.keys(presets).join(', ')}`);
  console.log(`\n📖 API endpoints:`);
  console.log(`   GET  /api/presets - List all presets`);
  console.log(`   GET  /api/presets/:name - Get specific preset config`);
  console.log(`   POST /process - Process image with custom settings\n`);
  
  // Load face detection models
  console.log('🔄 Loading face detection models...');
  await loadModels();
});

module.exports = app; 