/**
 * Image Processing Configuration
 * 
 * Easily adjust these settings to customize your image processing.
 * All values are multipliers (1.0 = no change, >1.0 = increase, <1.0 = decrease)
 */

const processingConfig = {
  // Brightness settings
  brightness: {
    // Base brightness adjustment for all images
    base: 1.2,
    
    // Adaptive brightness based on image darkness
    darkImages: 1.16,      // Images with avg luminance < darkThreshold
    mediumDarkImages: 1.12, // Images with avg luminance darkThreshold-mediumThreshold
    brightImages: 1.05,     // Images with avg luminance > brightThreshold
    
    // Brightness thresholds for adaptive adjustment
    darkThreshold: 100,     // Below this = dark image
    mediumThreshold: 140,   // Between dark and bright
    brightThreshold: 180,   // Above this = bright image
    
    // Final brightness tweak
    final: 1.01
  },

  // Color and saturation
  color: {
    saturation: 0.85,      // Color intensity
    finalSaturation: 1.04, // Final saturation adjustment
    hue: -8                // Hue shift (0 = no change)
  },

  // Contrast and gamma
  contrast: {
    gamma: 1.0,            // Gamma correction for mid-tones
    linearMultiplier: 1.07, // Linear contrast multiplier
    linearOffset: 1.5      // Linear contrast offset
  },

  // Sharpening
  sharpening: {
    sigma: 0.9,            // Sharpening intensity
    flat: 1.0,             // Flat area preservation
    jagged: 2.0            // Edge enhancement
  },

  // Cropping behavior
  cropping: {
    // How much of the image to include (0.5 = tight crop, 1.0 = loose crop)
    faceDetectedSize: 0.65,   // When face is detected
    fallbackSize: 0.8,       // When no face detected
    
    // Tight crop detection settings
    tightCropDetection: {
      enabled: true,                    // Enable tight crop detection
      faceToImageRatioThreshold: 0.03,  // Face area / image area ratio that indicates tight crop (3%)
      faceEdgeDistanceThreshold: 0.20,  // Face distance from edges (relative to image size) (20%)
      looseCropSize: 0.95,              // Crop size when already tight (minimal crop)
      skipCropSize: 1.0                 // When to skip cropping entirely
    },
    
    // Face positioning in frame (0.0 = top, 0.5 = center, 1.0 = bottom)
    faceVerticalOffset: 0.1, // Move face down in frame
    
    // Aspect ratio threshold for landscape vs portrait detection
    landscapeThreshold: 1.2, // Above this ratio = landscape image
    
    // Fallback positioning when no face is detected
    fallbackLandscapeTop: 0.25,  // For landscape images (aspect ratio > landscapeThreshold)
    fallbackPortraitTop: 0.2     // For portrait/square images
  },

  // Output settings
  output: {
    quality: 95,           // PNG quality (0-100)
    compressionLevel: 6,   // PNG compression (0-9)
    size: 1024            // Output image size (pixels)
  }
};

// Preset configurations for quick access
const presets = {
  // Default balanced processing
  default: processingConfig,

  // For dark or underexposed photos
  brighten: {
    ...processingConfig,
    brightness: {
      ...processingConfig.brightness,
      base: 1.20,
      darkImages: 1.25,
      mediumDarkImages: 1.18,
      final: 1.05
    },
    contrast: {
      ...processingConfig.contrast,
      gamma: 1.25,
      linearMultiplier: 1.15
    }
  },

  // For already well-lit photos
  subtle: {
    ...processingConfig,
    brightness: {
      ...processingConfig.brightness,
      base: 1.05,
      darkImages: 1.08,
      mediumDarkImages: 1.06,
      final: 1.0
    },
    color: {
      ...processingConfig.color,
      saturation: 1.05,
      finalSaturation: 1.02
    }
  },

  // High contrast and vibrant
  vibrant: {
    ...processingConfig,
    brightness: {
      ...processingConfig.brightness,
      base: 1.15
    },
    color: {
      ...processingConfig.color,
      saturation: 1.20,
      finalSaturation: 1.08
    },
    contrast: {
      ...processingConfig.contrast,
      gamma: 1.30,
      linearMultiplier: 1.12
    },
    sharpening: {
      ...processingConfig.sharpening,
      sigma: 1.5,
      jagged: 2.5
    }
  },

  // Soft and natural
  natural: {
    ...processingConfig,
    brightness: {
      ...processingConfig.brightness,
      base: 1.08,
      final: 1.0
    },
    color: {
      ...processingConfig.color,
      saturation: 1.08,
      finalSaturation: 1.02
    },
    contrast: {
      ...processingConfig.contrast,
      gamma: 1.10,
      linearMultiplier: 1.05
    },
    sharpening: {
      ...processingConfig.sharpening,
      sigma: 0.8,
      jagged: 1.5
    }
  }
};

module.exports = {
  processingConfig,
  presets,
  
  // Helper function to get a preset or custom config
  getConfig: (presetName = 'default') => {
    return presets[presetName] || presets.default;
  },
  
  // Helper function to merge custom settings with a preset
  mergeConfig: (basePreset = 'default', customSettings = {}) => {
    const base = presets[basePreset] || presets.default;
    return {
      ...base,
      ...customSettings,
      brightness: { ...base.brightness, ...customSettings.brightness },
      color: { ...base.color, ...customSettings.color },
      contrast: { ...base.contrast, ...customSettings.contrast },
      sharpening: { ...base.sharpening, ...customSettings.sharpening },
      cropping: { 
        ...base.cropping, 
        ...customSettings.cropping,
        // Deep merge tightCropDetection to preserve all default values
        tightCropDetection: {
          ...base.cropping.tightCropDetection,
          ...customSettings.cropping?.tightCropDetection
        }
      },
      output: { ...base.output, ...customSettings.output }
    };
  }
}; 