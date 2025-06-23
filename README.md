# 🎨 Advanced Image Processor

A powerful and intuitive image processing tool designed for avatar and portrait enhancement with easily customizable settings.

## ✨ Features

- **🎛️ Easy Configuration**: Adjust brightness, saturation, contrast, and more through simple config files
- **🖥️ Web Interface**: Beautiful, intuitive web UI with real-time sliders
- **⚡ Command Line**: Quick processing via CLI with custom parameters
- **🎯 Smart Cropping**: AI-powered face detection for optimal avatar framing
- **📐 Multiple Presets**: Pre-configured settings for different photo types
- **🔧 Fully Customizable**: Fine-tune every aspect of the processing pipeline

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Web Interface
```bash
npm start
```
Then open http://localhost:3001 in your browser.

### 3. Or Use Command Line
```bash
# Quick brightness adjustment
node quick-adjust.js input.jpg output.jpg --brightness 1.3

# Use a preset
node quick-adjust.js input.jpg output.jpg --preset vibrant

# Combine preset with custom settings
node quick-adjust.js input.jpg output.jpg --preset default --brightness 1.2 --saturation 1.15
```

## 🎛️ Easy Settings Adjustment

### Method 1: Edit Configuration File (Recommended)

The easiest way to adjust settings is by editing `config.js`. All settings are clearly documented:

```javascript
// In config.js
const processingConfig = {
  brightness: {
    base: 1.10,           // Increase for brighter images (1.0 = no change)
    darkImages: 1.16,     // Extra brightness for dark photos
    mediumDarkImages: 1.12,
    brightImages: 1.05,
    final: 1.01           // Final brightness tweak
  },
  
  color: {
    saturation: 1.10,     // Color intensity (1.0 = no change)
    finalSaturation: 1.04,
    hue: 0                // Color hue shift
  },
  
  contrast: {
    gamma: 1.17,          // Contrast/mid-tone adjustment
    linearMultiplier: 1.07,
    linearOffset: 1.5
  },
  
  sharpening: {
    sigma: 1.2,           // Sharpening intensity
    flat: 1.0,
    jagged: 2.0           // Edge enhancement
  }
};
```

**To adjust brightness**: Change the `base` value in `brightness` section:
- `1.0` = no change
- `1.2` = 20% brighter
- `0.9` = 10% darker

### Method 2: Web Interface

Use the intuitive web interface with real-time sliders:

1. Start the server: `npm start`
2. Open http://localhost:3001
3. Upload an image
4. Choose a preset or use custom sliders
5. Adjust brightness, saturation, contrast, etc.
6. Process and download

### Method 3: Command Line

Quick adjustments via command line:

```bash
# Brightness adjustment
node quick-adjust.js photo.jpg result.jpg --brightness 1.3

# Multiple adjustments
node quick-adjust.js photo.jpg result.jpg --brightness 1.2 --saturation 1.15 --gamma 1.25

# See all options
node quick-adjust.js --help
```

## 📋 Available Presets

| Preset | Best For | Brightness | Saturation | Contrast |
|--------|----------|------------|------------|----------|
| `default` | Most photos | 1.10 | 1.10 | 1.17 |
| `brighten` | Dark/underexposed | 1.20 | 1.10 | 1.25 |
| `subtle` | Well-lit photos | 1.05 | 1.05 | 1.17 |
| `vibrant` | High impact | 1.15 | 1.20 | 1.30 |
| `natural` | Soft appearance | 1.08 | 1.08 | 1.10 |

View all presets:
```bash
npm run presets
```

## 🔧 Command Line Reference

### Basic Usage
```bash
node quick-adjust.js <input> <output> [options]
```

### Options
- `--preset <name>` - Use preset (default, brighten, subtle, vibrant, natural)
- `--brightness <value>` - Brightness multiplier (0.8-1.4)
- `--saturation <value>` - Saturation multiplier (0.8-1.5)
- `--gamma <value>` - Gamma/contrast (0.8-1.8)
- `--sharpening <value>` - Sharpening intensity (0.5-2.5)
- `--crop-size <value>` - Crop size (0.5-1.0)

### Examples
```bash
# Make image 30% brighter
node quick-adjust.js dark-photo.jpg bright-photo.jpg --brightness 1.3

# Use vibrant preset
node quick-adjust.js photo.jpg result.jpg --preset vibrant

# Custom combination
node quick-adjust.js photo.jpg result.jpg --preset default --brightness 1.25 --saturation 1.2

# Batch processing (using shell)
for file in *.jpg; do
  node quick-adjust.js "$file" "processed_$file" --brightness 1.2
done
```

## 🌐 Web API

### Process with Custom Settings
```bash
curl -X POST http://localhost:3001/process \
  -F "image=@photo.jpg" \
  -F "preset=default" \
  -F 'customSettings={"brightness":{"base":1.3},"color":{"saturation":1.15}}'
```

### Get Available Presets
```bash
curl http://localhost:3001/api/presets
```

## 📁 Project Structure

```
├── config.js              # 🎛️ Main configuration file (EDIT THIS!)
├── image-processor.js      # Core processing logic
├── server.js              # Web server and interface
├── quick-adjust.js         # Command line interface
├── package.json           # Dependencies and scripts
├── models/                 # AI face detection models
├── output/                 # Processed images
└── uploads/               # Temporary uploads
```

## 🎯 Quick Tips

### For Consistently Dark Photos
Edit `config.js` and increase brightness values:
```javascript
brightness: {
  base: 1.25,           // Increase from 1.10
  darkImages: 1.30,     // Increase from 1.16
  // ...
}
```

### For Oversaturated Results
Reduce saturation in `config.js`:
```javascript
color: {
  saturation: 1.05,     // Decrease from 1.10
  finalSaturation: 1.02, // Decrease from 1.04
}
```

### For Softer Images
Reduce sharpening:
```javascript
sharpening: {
  sigma: 0.8,           // Decrease from 1.2
  jagged: 1.5,          // Decrease from 2.0
}
```

## 🚀 Advanced Usage

### Custom Preset Creation
Add your own preset to `config.js`:
```javascript
const presets = {
  // ... existing presets
  myCustom: {
    ...processingConfig,
    brightness: { ...processingConfig.brightness, base: 1.25 },
    color: { ...processingConfig.color, saturation: 1.15 },
    // ... other customizations
  }
};
```

### Batch Processing Script
Create a batch processing script:
```javascript
const { processImageFile } = require('./image-processor');
const fs = require('fs');
const path = require('path');

async function batchProcess() {
  const inputDir = './photos';
  const outputDir = './processed';
  
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.jpg'));
  
  for (const file of files) {
    const input = path.join(inputDir, file);
    const output = path.join(outputDir, `processed_${file}`);
    
    await processImageFile(input, output, 'brighten', {
      brightness: { base: 1.3 }
    });
    
    console.log(`Processed: ${file}`);
  }
}

batchProcess();
```

## 📊 Performance

- **Processing Time**: ~500-2000ms per image (depending on size and complexity)
- **Memory Usage**: ~200-500MB during processing
- **Supported Formats**: JPEG, PNG, WebP
- **Output Format**: High-quality PNG
- **Face Detection**: Optional AI-powered face detection for smart cropping

## 🛠️ Troubleshooting

### Images Too Dark/Bright
1. Check the preset you're using
2. Adjust brightness in `config.js` or via command line
3. Try different presets (`brighten` for dark images, `subtle` for bright ones)

### Face Detection Not Working
- Face detection models are loaded automatically
- Falls back to heuristic positioning if detection fails
- Check console for model loading messages

### Memory Issues
- Reduce image size before processing
- Process images one at a time instead of batch
- Restart the server periodically for long-running sessions

## 📝 License

MIT License - feel free to use and modify as needed! 