# AI-Powered Image Processing Cloud Function

A production-ready Firebase Cloud Function that automatically crops and enhances images using AI face detection and advanced image processing techniques.

## 🎯 Features

- **🤖 AI Face Detection**: Automatically detects faces and crops images intelligently
- **🎨 Professional Image Enhancement**: Brightness, contrast, saturation, and sharpening adjustments
- **⚡ 5 Processing Presets**: Optimized settings for different photo types
- **🚀 Serverless & Scalable**: Firebase Cloud Functions with automatic scaling
- **🌐 REST API**: Simple HTTP endpoints for easy integration
- **💰 Cost-Effective**: Pay only for actual usage

## 📸 What It Does

This system transforms any photo into a professional-quality avatar by:

1. **Smart Cropping**: Uses TensorFlow.js to detect faces and crop around them
2. **Intelligent Fallback**: Uses heuristic positioning when no face is detected
3. **Professional Enhancement**: Applies color correction, brightness, and sharpening
4. **Consistent Output**: Always produces 1024x1024 high-quality PNG images

## 🚀 Quick Start

### Prerequisites

1. **Firebase CLI**: `npm install -g firebase-tools`
2. **Firebase Project**: Create at [console.firebase.google.com](https://console.firebase.google.com)
3. **Billing Enabled**: Required for Cloud Functions

### Setup & Deploy

```bash
# 1. Clone and setup
git clone <your-repo>
cd profile-processing

# 2. Login to Firebase
firebase login

# 3. Update project ID in .firebaserc
# Replace "your-project-id" with your actual Firebase project ID

# 4. Install dependencies
cd functions
npm install

# 5. Deploy to Firebase
firebase deploy --only functions
```

### Test Your API

```bash
# Test with cURL
curl -X POST \
  -F "image=@test-image.jpg" \
  -F "preset=default" \
  https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/processImage \
  --output result.png
```

## 🎨 Available Presets

| Preset | Best For | Description |
|--------|----------|-------------|
| `default` | General use | Balanced enhancement for professional avatars |
| `brighten` | Dark photos | Extra brightness boost for underexposed images |
| `subtle` | Well-lit photos | Gentle enhancement for already good photos |
| `vibrant` | Social media | High contrast and saturated colors |
| `natural` | Portraits | Soft, natural-looking enhancement |

## 🔌 API Reference

### Process Image
**POST** `https://us-central1-{project-id}.cloudfunctions.net/processImage`

**Parameters:**
- `image` (file): Image file (JPEG, PNG, WebP, max 10MB)
- `preset` (string, optional): Processing preset (default: "default")
- `customSettings` (JSON, optional): Custom processing parameters

**Response:** Processed image as PNG

### Get Available Presets
**GET** `https://us-central1-{project-id}.cloudfunctions.net/presets`

**Response:**
```json
{
  "presets": [
    {
      "name": "default",
      "description": "Balanced settings for professional avatars",
      "settings": { ... }
    }
  ],
  "defaultPreset": "default"
}
```

### Health Check
**GET** `https://us-central1-{project-id}.cloudfunctions.net/health`

**Response:**
```json
{
  "status": "ok",
  "service": "image-processor",
  "timestamp": "2024-01-15T10:30:00Z",
  "availablePresets": ["default", "brighten", "subtle", "vibrant", "natural"]
}
```

## 💻 Integration Examples

### JavaScript/Web
```javascript
async function processImage(imageFile, preset = 'default') {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('preset', preset);

  const response = await fetch(
    'https://us-central1-your-project-id.cloudfunctions.net/processImage',
    {
      method: 'POST',
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error('Image processing failed');
  }

  return await response.blob();
}

// Usage
const processedImageBlob = await processImage(fileInput.files[0], 'vibrant');
const imageUrl = URL.createObjectURL(processedImageBlob);
document.getElementById('result').src = imageUrl;
```

### React Component
```jsx
import React, { useState } from 'react';

const ImageProcessor = () => {
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('preset', 'default');

      const response = await fetch(
        'https://us-central1-your-project-id.cloudfunctions.net/processImage',
        { method: 'POST', body: formData }
      );

      const blob = await response.blob();
      setProcessedImage(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {loading && <p>Processing...</p>}
      {processedImage && (
        <img src={processedImage} alt="Processed" style={{ maxWidth: '300px' }} />
      )}
    </div>
  );
};
```

### Python Backend
```python
import requests

def process_image(image_path, preset='default'):
    url = 'https://us-central1-your-project-id.cloudfunctions.net/processImage'
    
    with open(image_path, 'rb') as f:
        files = {'image': f}
        data = {'preset': preset}
        
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()
        
        return response.content

# Usage
processed_image = process_image('input.jpg', 'brighten')
with open('output.png', 'wb') as f:
    f.write(processed_image)
```

### Node.js Backend
```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function processImage(imagePath, preset = 'default') {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  form.append('preset', preset);

  const response = await fetch(
    'https://us-central1-your-project-id.cloudfunctions.net/processImage',
    {
      method: 'POST',
      body: form
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.buffer();
}

// Usage
const processedBuffer = await processImage('input.jpg', 'natural');
fs.writeFileSync('output.png', processedBuffer);
```

## ⚙️ Configuration

### Custom Processing Settings
You can override any preset with custom settings:

```javascript
const customSettings = {
  brightness: {
    base: 1.2,
    final: 1.05
  },
  color: {
    saturation: 1.15
  },
  cropping: {
    faceDetectedSize: 0.8
  }
};

formData.append('customSettings', JSON.stringify(customSettings));
```

### Performance Settings
The function is configured with:
- **Memory**: 2GB (handles complex AI processing)
- **Timeout**: 9 minutes (processes large images)
- **File Limit**: 10MB per image
- **Output**: 1024x1024 PNG (high quality)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Firebase Cloud  │───▶│   AI Models     │
│                 │    │    Function      │    │                 │
│ • Web App       │    │                  │    │ • Face Detection│
│ • Mobile App    │    │ • Image Upload   │    │ • TensorFlow.js │
│ • Backend API   │    │ • Face Detection │    │                 │
│                 │    │ • Image Process  │    │                 │
└─────────────────┘    │ • Return PNG     │    └─────────────────┘
                       └──────────────────┘
```

### Key Components

1. **Face Detection**: TensorFlow.js + face-api.js for accurate face detection
2. **Image Processing**: Sharp.js for high-performance image manipulation
3. **Smart Cropping**: Dynamic crop positioning based on face location
4. **Enhancement Pipeline**: Multi-stage color correction and sharpening

## 📁 Project Structure

```
profile-processing/
├── functions/                  # Firebase Cloud Functions
│   ├── index.js               # Main function endpoints
│   ├── image-processor.js     # Core processing logic
│   ├── config.js             # Presets and settings
│   ├── package.json          # Dependencies
│   └── models/               # AI face detection models
├── .firebaserc               # Firebase project config
├── firebase.json            # Firebase configuration
├── README.md               # This file
├── README-firebase.md      # Detailed Firebase guide
└── DEPLOYMENT-CHECKLIST.md # Deployment steps
```

## 🔧 Local Development

### Test Locally
```bash
# Start Firebase emulators
firebase emulators:start --only functions

# Your function will be available at:
# http://localhost:5001/your-project-id/us-central1/processImage
```

### Debug
```bash
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only processImage
```

## 🚨 Troubleshooting

### Common Issues

**"Models not found"**
- Ensure `functions/models/` directory exists with all 3 model files
- Verify models are deployed with your function

**Memory errors**
- Increase memory allocation in `functions/index.js`
- Current setting: 2GB (sufficient for most use cases)

**Timeout errors**
- Increase timeout for very large images
- Current setting: 540 seconds (9 minutes)

**CORS errors**
- Function includes CORS headers for web browser access
- Modify headers in `functions/index.js` if needed

**Billing errors**
- Ensure your Firebase project has billing enabled
- Cloud Functions require a paid plan

### Debug Commands
```bash
# Check function status
firebase functions:list

# View detailed logs
firebase functions:log --limit 50

# Deploy specific function
firebase deploy --only functions:processImage
```

## 💰 Cost Estimation

Firebase Cloud Functions pricing (approximate):
- **Invocations**: $0.40 per million requests
- **Compute Time**: $0.0000025 per GB-second
- **Memory**: 2GB allocated
- **Average Processing**: 3-8 seconds per image

**Example**: Processing 1,000 images/month ≈ $2-5/month

## 🔒 Security

- **File Type Validation**: Only JPEG, PNG, WebP allowed
- **Size Limits**: 10MB maximum file size
- **CORS**: Configured for web browser access
- **No Data Storage**: Images are processed and returned immediately

## 📈 Monitoring

Monitor your function in the [Firebase Console](https://console.firebase.google.com):
- Request count and success rate
- Average execution time
- Memory usage
- Error logs and stack traces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: See `README-firebase.md` for detailed Firebase setup
- **Deployment**: See `DEPLOYMENT-CHECKLIST.md` for step-by-step guide
- **Issues**: Create an issue in this repository

---

**Ready to deploy? Follow the deployment checklist in `DEPLOYMENT-CHECKLIST.md`** 🚀 