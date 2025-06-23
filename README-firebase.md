# Firebase Cloud Functions Deployment Guide

## Overview
This guide explains how to deploy your image processing tool as Firebase Cloud Functions.

## Prerequisites
1. **Firebase CLI**: Install globally with `npm install -g firebase-tools`
2. **Firebase Project**: Create a project in the [Firebase Console](https://console.firebase.google.com)
3. **Authentication**: Login with `firebase login`

## Setup Steps

### 1. Initialize Firebase Project
```bash
# Initialize the project (if not already done)
firebase init

# Select these options:
# ✅ Functions: Configure and deploy Cloud Functions
# ✅ Hosting: Configure and deploy Firebase Hosting sites (optional)
```

### 2. Update Project Configuration
1. Edit `.firebaserc` and replace `"your-project-id"` with your actual Firebase project ID
2. The project ID can be found in your Firebase Console

### 3. Install Dependencies
```bash
cd functions
npm install
```

### 4. Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:processImage
```

## API Endpoints

After deployment, you'll have these endpoints:

### 1. Process Image
**POST** `https://us-central1-{your-project-id}.cloudfunctions.net/processImage`

**Content-Type**: `multipart/form-data`

**Parameters**:
- `image` (file): The image to process
- `preset` (string, optional): Processing preset ('default', 'bright', 'soft', etc.)
- `customSettings` (JSON string, optional): Custom processing settings

**Example using curl**:
```bash
curl -X POST \
  -F "image=@path/to/your/image.jpg" \
  -F "preset=default" \
  https://us-central1-your-project-id.cloudfunctions.net/processImage \
  --output processed-image.png
```

**Example using JavaScript**:
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('preset', 'default');

const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/processImage', {
  method: 'POST',
  body: formData
});

const processedImageBlob = await response.blob();
```

### 2. Health Check
**GET** `https://us-central1-{your-project-id}.cloudfunctions.net/health`

Returns service status and available presets.

### 3. Get Presets
**GET** `https://us-central1-{your-project-id}.cloudfunctions.net/presets`

Returns all available processing presets and their configurations.

## Local Testing

### Start Emulators
```bash
firebase emulators:start --only functions
```

Your functions will be available at:
- `http://localhost:5001/{your-project-id}/us-central1/processImage`
- `http://localhost:5001/{your-project-id}/us-central1/health`
- `http://localhost:5001/{your-project-id}/us-central1/presets`

## Configuration

### Memory and Timeout
The functions are configured with:
- **Memory**: 2GB (needed for image processing and face detection)
- **Timeout**: 9 minutes (540 seconds)

You can adjust these in `functions/index.js`:
```javascript
exports.processImage = functions
  .runWith({
    memory: '2GB',        // Adjust as needed
    timeoutSeconds: 540,  // Adjust as needed
  })
```

### Supported Image Formats
- JPEG
- PNG
- WebP

### File Size Limits
- Default: 10MB per image
- Firebase Functions max: 32MB total request size

## Cost Optimization

### Cold Starts
The function pre-loads face detection models to reduce cold start times. First invocation may be slower.

### Billing
- **Invocations**: Pay per request
- **Compute Time**: Pay for execution time
- **Memory**: Pay for allocated memory during execution
- **Network**: Outbound data transfer costs

### Tips to Reduce Costs
1. Use appropriate memory allocation (don't over-allocate)
2. Optimize image processing pipeline
3. Consider caching processed images in Firebase Storage
4. Monitor usage with Firebase Analytics

## Monitoring and Logs

### View Logs
```bash
firebase functions:log
```

### View Specific Function Logs
```bash
firebase functions:log --only processImage
```

### Monitor Performance
Use the Firebase Console to monitor:
- Function execution times
- Error rates
- Memory usage
- Invocation count

## Security Considerations

### CORS
The functions include CORS headers for web browser access. Adjust in `functions/index.js` as needed.

### Authentication (Optional)
To add authentication, modify the functions to check Firebase Auth tokens:

```javascript
const { getAuth } = require('firebase-admin/auth');

// In your function
const token = req.headers.authorization?.split('Bearer ')[1];
if (token) {
  const decodedToken = await getAuth().verifyIdToken(token);
  // User is authenticated
}
```

## Troubleshooting

### Common Issues
1. **Model Loading Errors**: Ensure the `models/` directory is included in deployment
2. **Memory Errors**: Increase memory allocation if processing large images
3. **Timeout Errors**: Increase timeout for complex processing
4. **Dependencies**: Ensure all required packages are in `functions/package.json`

### Debug Locally
```bash
cd functions
npm run serve
```

## Integration Examples

### Web Frontend
```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Processor</title>
</head>
<body>
    <input type="file" id="imageInput" accept="image/*">
    <img id="result" style="max-width: 500px;">
    
    <script>
        document.getElementById('imageInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('preset', 'default');
            
            const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/processImage', {
                method: 'POST',
                body: formData
            });
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('result').src = url;
        });
    </script>
</body>
</html>
```

### React Component
```jsx
import React, { useState } from 'react';

const ImageProcessor = () => {
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const processImage = async (file) => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('preset', 'default');

    try {
      const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/processImage', {
        method: 'POST',
        body: formData
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => processImage(e.target.files[0])}
        disabled={loading}
      />
      {loading && <p>Processing...</p>}
      {processedImage && <img src={processedImage} alt="Processed" />}
    </div>
  );
};

export default ImageProcessor;
``` 