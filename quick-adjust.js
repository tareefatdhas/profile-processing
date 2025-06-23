#!/usr/bin/env node

/**
 * Quick Image Adjustment CLI
 * 
 * Usage:
 *   node quick-adjust.js input.jpg output.jpg --brightness 1.2 --saturation 1.1
 *   node quick-adjust.js input.jpg output.jpg --preset vibrant
 *   node quick-adjust.js input.jpg output.jpg --preset default --brightness 1.3
 */

const { processImageFile } = require('./image-processor');
const { getConfig, mergeConfig } = require('./config');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🎨 Quick Image Adjustment CLI

Usage:
  node quick-adjust.js <input> <output> [options]

Options:
  --preset <name>           Use preset (default, brighten, subtle, vibrant, natural)
  --brightness <value>      Brightness multiplier (0.8-1.4)
  --saturation <value>      Saturation multiplier (0.8-1.5)
  --gamma <value>           Gamma/contrast (0.8-1.8)
  --sharpening <value>      Sharpening intensity (0.5-2.5)
  --crop-size <value>       Crop size (0.5-1.0)
  --help                    Show this help

Examples:
  node quick-adjust.js photo.jpg result.jpg --brightness 1.2
  node quick-adjust.js photo.jpg result.jpg --preset vibrant
  node quick-adjust.js photo.jpg result.jpg --preset default --brightness 1.3 --saturation 1.15
    `);
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  const options = {};
  
  for (let i = 2; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--preset':
        options.preset = value;
        break;
      case '--brightness':
        options.brightness = parseFloat(value);
        break;
      case '--saturation':
        options.saturation = parseFloat(value);
        break;
      case '--gamma':
        options.gamma = parseFloat(value);
        break;
      case '--sharpening':
        options.sharpening = parseFloat(value);
        break;
      case '--crop-size':
        options.cropSize = parseFloat(value);
        break;
      case '--help':
        console.log('Help text shown above');
        process.exit(0);
        break;
      default:
        console.warn(`Unknown option: ${flag}`);
    }
  }
  
  return { inputFile, outputFile, options };
}

// Validate input file
function validateInput(inputFile) {
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  const ext = path.extname(inputFile).toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (!validExtensions.includes(ext)) {
    console.error(`❌ Unsupported file type: ${ext}`);
    console.error(`Supported types: ${validExtensions.join(', ')}`);
    process.exit(1);
  }
}

// Build custom settings from options
function buildCustomSettings(options) {
  const customSettings = {};
  
  if (options.brightness !== undefined) {
    customSettings.brightness = { base: options.brightness };
  }
  
  if (options.saturation !== undefined) {
    customSettings.color = { saturation: options.saturation };
  }
  
  if (options.gamma !== undefined) {
    customSettings.contrast = { gamma: options.gamma };
  }
  
  if (options.sharpening !== undefined) {
    customSettings.sharpening = { sigma: options.sharpening };
  }
  
  if (options.cropSize !== undefined) {
    customSettings.cropping = { faceDetectedSize: options.cropSize };
  }
  
  return customSettings;
}

// Main function
async function main() {
  try {
    const { inputFile, outputFile, options } = parseArgs();
    
    // Validate input
    validateInput(inputFile);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Build settings
    const preset = options.preset || 'default';
    const customSettings = buildCustomSettings(options);
    
    console.log(`\n🎨 Processing image with settings:`);
    console.log(`📁 Input:  ${inputFile}`);
    console.log(`📁 Output: ${outputFile}`);
    console.log(`🎛️  Preset: ${preset}`);
    
    if (Object.keys(customSettings).length > 0) {
      console.log(`⚙️  Custom settings:`);
      if (customSettings.brightness?.base) {
        console.log(`   Brightness: ${customSettings.brightness.base}`);
      }
      if (customSettings.color?.saturation) {
        console.log(`   Saturation: ${customSettings.color.saturation}`);
      }
      if (customSettings.contrast?.gamma) {
        console.log(`   Gamma: ${customSettings.contrast.gamma}`);
      }
      if (customSettings.sharpening?.sigma) {
        console.log(`   Sharpening: ${customSettings.sharpening.sigma}`);
      }
      if (customSettings.cropping?.faceDetectedSize) {
        console.log(`   Crop size: ${customSettings.cropping.faceDetectedSize}`);
      }
    }
    
    console.log(`\n⏳ Processing...`);
    const startTime = Date.now();
    
    // Process the image
    await processImageFile(inputFile, outputFile, preset, customSettings);
    
    const processingTime = Date.now() - startTime;
    
    // Get file sizes
    const inputStats = fs.statSync(inputFile);
    const outputStats = fs.statSync(outputFile);
    
    console.log(`\n✅ Processing complete!`);
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`📊 Input size:  ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Output size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📁 Saved to: ${outputFile}\n`);
    
  } catch (error) {
    console.error(`\n❌ Error processing image:`, error.message);
    process.exit(1);
  }
}

// Show available presets if requested
if (process.argv.includes('--list-presets')) {
  const { presets } = require('./config');
  console.log('\n🎛️ Available presets:\n');
  
  Object.entries(presets).forEach(([name, config]) => {
    console.log(`${name}:`);
    console.log(`  Brightness: ${config.brightness.base}`);
    console.log(`  Saturation: ${config.color.saturation}`);
    console.log(`  Gamma: ${config.contrast.gamma}`);
    console.log(`  Sharpening: ${config.sharpening.sigma}`);
    console.log(`  Crop size: ${config.cropping.faceDetectedSize}\n`);
  });
  
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, buildCustomSettings }; 