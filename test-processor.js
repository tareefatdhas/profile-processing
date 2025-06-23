const { processImageFile } = require('./image-processor');
const path = require('path');
const fs = require('fs');

async function testProcessor() {
  console.log('🧪 Testing Image Processor\n');

  // Get input file from command line arguments
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.log('Usage: node test-processor.js <input-image-path>');
    console.log('Example: node test-processor.js ./test-images/portrait.jpg');
    return;
  }

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    return;
  }

  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate output filename
    const inputExt = path.extname(inputFile);
    const inputName = path.basename(inputFile, inputExt);
    const outputFile = path.join(outputDir, `${inputName}_processed.png`);

    console.log(`📥 Input:  ${inputFile}`);
    console.log(`📤 Output: ${outputFile}`);
    console.log('🔄 Processing...\n');

    const startTime = Date.now();
    
    // Process the image
    await processImageFile(inputFile, outputFile);
    
    const processingTime = Date.now() - startTime;
    
    // Get file sizes
    const inputStats = fs.statSync(inputFile);
    const outputStats = fs.statSync(outputFile);
    
    console.log('✅ Processing complete!\n');
    console.log('📊 Results:');
    console.log(`   • Processing time: ${processingTime}ms`);
    console.log(`   • Original size:   ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   • Processed size:  ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   • Size ratio:      ${((outputStats.size / inputStats.size) * 100).toFixed(1)}%`);
    console.log(`\n🎉 Processed image saved to: ${outputFile}`);

  } catch (error) {
    console.error('❌ Error processing image:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testProcessor();
}

module.exports = { testProcessor }; 