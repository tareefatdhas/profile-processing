# Tight Crop Detection Feature

## Overview

The tight crop detection feature automatically detects when a photo is already tightly cropped around the subject's face and adjusts the cropping behavior accordingly. This prevents over-cropping of images that are already well-composed.

## How It Works

When enabled, the system analyzes two key metrics:

1. **Face-to-Image Ratio**: The proportion of the image occupied by the detected face
2. **Face Edge Distance**: How close the face is to the image edges

If either metric indicates the image is already tightly cropped, the system applies a much looser crop (or skips cropping entirely) instead of the normal crop.

## Configuration

### Default Settings

```javascript
tightCropDetection: {
  enabled: true,                    // Enable tight crop detection
  faceToImageRatioThreshold: 0.03,  // Face area / image area ratio that indicates tight crop (3%)
  faceEdgeDistanceThreshold: 0.20,  // Face distance from edges (relative to image size) (20%)
  looseCropSize: 0.95,              // Crop size when already tight (minimal crop)
  skipCropSize: 1.0                 // When to skip cropping entirely
}
```

### Understanding the Thresholds

- **faceToImageRatioThreshold (3%)**: The face detection algorithm identifies facial features (eyes, nose, mouth) rather than the entire head. A 3% threshold works well for typical portrait photos.
- **faceEdgeDistanceThreshold (20%)**: If the face center is within 20% of any edge, it's considered a tight crop.

### Customizing Settings

You can adjust the sensitivity by modifying the thresholds:

- **Lower `faceToImageRatioThreshold`**: More sensitive detection (more images considered tight)
- **Higher `faceEdgeDistanceThreshold`**: More sensitive detection (detects tight crops earlier)
- **Higher `looseCropSize`**: Less aggressive loose cropping (0.95 = 95% of original size)

## Usage Examples

### CLI Usage

```bash
# Use default tight crop detection
node quick-adjust.js input.jpg output.jpg

# Disable tight crop detection
node quick-adjust.js input.jpg output.jpg --tight-crop-off

# Customize loose crop size
node quick-adjust.js input.jpg output.jpg --loose-crop 0.98

# Combine with other settings
node quick-adjust.js input.jpg output.jpg --preset vibrant --loose-crop 0.95
```

### Programmatic Usage

```javascript
const { preprocessImage } = require('./image-processor');

// Use default tight crop detection
await preprocessImage('input.jpg', 'default');

// Disable tight crop detection
await preprocessImage('input.jpg', 'default', {
  cropping: {
    tightCropDetection: {
      enabled: false
    }
  }
});

// Custom tight crop settings for more sensitive detection
await preprocessImage('input.jpg', 'default', {
  cropping: {
    tightCropDetection: {
      enabled: true,
      faceToImageRatioThreshold: 0.02,  // More sensitive (2%)
      faceEdgeDistanceThreshold: 0.25,  // More sensitive (25%)
      looseCropSize: 0.98               // Very loose crop
    }
  }
});
```

## Detection Output

When tight crop is detected, you'll see console output like:

```
📊 Face detection analysis:
   - Face box: 327x293 at (187, 513)
   - Face area: 95725 pixels (3.24% of image)
   - Face center: (350, 659)
   - Distance to edges: L=18.2%, R=81.8%, T=42.9%, B=57.1%
   - Min edge distance: 18.2%
   - Thresholds: face ratio > 3% OR edge distance < 20%
🔍 Tight crop detected - Face ratio: 3.2%, Min edge distance: 18.2%
📏 Using loose crop size: 0.95 (image already tight)
```

## Benefits

1. **Prevents Over-Cropping**: Avoids cutting off important parts of already well-composed photos
2. **Maintains Composition**: Preserves the original framing when it's already optimal
3. **Automatic Detection**: No manual intervention required
4. **Configurable**: Can be tuned for different use cases and preferences

## When It Triggers

The detection typically triggers for:

- Professional headshots
- Close-up portraits
- Images already cropped for social media profiles
- Selfies taken at close range
- Any image where the face is prominent and near the edges

## Disabling the Feature

If you prefer consistent cropping behavior regardless of input composition:

```javascript
// Disable in config
cropping: {
  tightCropDetection: {
    enabled: false
  }
}
```

Or use the CLI flag:
```bash
node quick-adjust.js input.jpg output.jpg --tight-crop-off
```

## Troubleshooting

If tight crop detection isn't working as expected:

1. **Check the debug output**: Look for the "Face detection analysis" section
2. **Adjust thresholds**: 
   - If not detecting tight crops: Lower `faceToImageRatioThreshold` or raise `faceEdgeDistanceThreshold`
   - If detecting too many as tight: Raise `faceToImageRatioThreshold` or lower `faceEdgeDistanceThreshold`
3. **Verify face detection**: Ensure the face is being detected (look for "✅ Face detected" message) 