# Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Account**: Ensure you have a Google Cloud account
2. **Google Cloud CLI**: Install gcloud CLI
3. **Docker**: Not required for source-based deployment

## Step 1: Install Google Cloud CLI

If you don't have gcloud installed:

```bash
# On macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

## Step 2: Authenticate and Setup

```bash
# Login to Google Cloud
gcloud auth login

# Set your project (replace PROJECT_ID with your actual project ID)
gcloud config set project PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Step 3: Deploy to Cloud Run

You have two deployment options:

### Option A: Direct Source Deployment (Recommended)

```bash
# Deploy directly from source code
gcloud run deploy image-processor \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 0 \
  --allow-unauthenticated \
  --port 8080
```

### Option B: Docker Build and Deploy

```bash
# Build Docker image
docker build -t gcr.io/PROJECT_ID/image-processor .

# Push to Google Container Registry
docker push gcr.io/PROJECT_ID/image-processor

# Deploy to Cloud Run
gcloud run deploy image-processor \
  --image gcr.io/PROJECT_ID/image-processor \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --allow-unauthenticated
```

## Step 4: Configuration Options

### Memory and CPU Settings
- **Memory**: 2Gi (handles ML models and image processing)
- **CPU**: 2 (better performance for face detection)
- **Max instances**: 10 (adjust based on expected load)
- **Min instances**: 0 (cost optimization - scales to zero)

### Environment Variables (Optional)
```bash
gcloud run services update image-processor \
  --set-env-vars="NODE_ENV=production,LOG_LEVEL=info"
```

## Step 5: Test Your Deployment

After deployment, you'll get a URL like:
`https://image-processor-[hash]-uc.a.run.app`

### Test Health Endpoint
```bash
curl https://your-service-url/health
```

### Test Image Processing
```bash
curl -X POST \
  -F "image=@test-image.jpg" \
  -F "preset=default" \
  https://your-service-url/process \
  --output processed-image.png
```

## Step 6: Update Firebase Function (Optional)

If you want to keep Firebase as a proxy:

```javascript
const functions = require('firebase-functions');

const CLOUD_RUN_URL = 'https://your-service-url';

exports.processImage = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }

    try {
      // Forward request to Cloud Run
      const response = await fetch(`${CLOUD_RUN_URL}/process`, {
        method: 'POST',
        body: req.body,
        headers: req.headers
      });
      
      const result = await response.buffer();
      res.set('Content-Type', response.headers.get('content-type'));
      res.send(result);
    } catch (error) {
      res.status(500).json({ error: 'Processing failed' });
    }
  });
```

## Deployment Commands Summary

```bash
# Quick deployment (all-in-one)
npm run gcloud:deploy

# Or manual step-by-step
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
gcloud run deploy image-processor \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --allow-unauthenticated
```

## Cost Optimization

- **Pay per request**: No charges when not in use
- **Automatic scaling**: Scales to zero when idle
- **Resource efficiency**: Only uses resources during processing

## Benefits Over Firebase Functions

✅ **No size limits** - Handles your 467MB dependencies  
✅ **Better cold starts** - Containers stay warm longer  
✅ **More memory** - Up to 8GB available  
✅ **Docker support** - Better ML library compatibility  
✅ **Predictable billing** - Pay for actual compute time  
✅ **Easier debugging** - Standard container environment  

## Next Steps

1. Deploy using the commands above
2. Test with your images
3. Update any client applications to use the new URL
4. Monitor performance and costs in Google Cloud Console 