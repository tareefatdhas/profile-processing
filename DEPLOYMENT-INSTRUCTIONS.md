# Image Processing Service - Cloud Run Deployment Instructions

## Overview
This package migrates the image processing service from Firebase Functions (which was failing due to 467MB dependencies) to Google Cloud Run, which can handle the heavy ML dependencies and provides better performance.

## What's Been Prepared

✅ **Express.js Server** (`app.js`) - Production-ready API server  
✅ **Docker Configuration** (`Dockerfile`, `.dockerignore`) - Optimized container setup  
✅ **Package Configuration** - Minimal dependencies for Cloud Run  
✅ **Health Checks & Monitoring** - Built-in endpoints for service monitoring  
✅ **Error Handling** - Comprehensive error handling and logging  

## Architecture Change

**Before (Firebase Functions - FAILING):**
```
Client → Firebase Function (467MB, deployment failures)
```

**After (Cloud Run - WORKING):**
```
Client → Cloud Run Service (handles any size, reliable deployment)
```

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Google Cloud CLI** installed (`gcloud`)
3. **Authenticated** with appropriate permissions

## Deployment Commands

### Option 1: One-Command Deployment (Recommended)

```bash
# Navigate to project directory
cd /path/to/profile-processing

# Deploy directly from source
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

### Option 2: Step-by-Step Deployment

```bash
# 1. Authenticate (if needed)
gcloud auth login

# 2. Set project (replace with your project ID)
gcloud config set project YOUR_PROJECT_ID

# 3. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 4. Deploy
gcloud run deploy image-processor \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --allow-unauthenticated
```

## Service Configuration

- **Memory**: 2GB (handles TensorFlow + image processing)
- **CPU**: 2 cores (better performance for face detection)
- **Scaling**: 0-10 instances (cost optimized)
- **Region**: us-central1 (lowest latency for most users)
- **Authentication**: Disabled (public API)

## API Endpoints

After deployment, you'll get a URL like: `https://image-processor-[hash]-uc.a.run.app`

### Available Endpoints:

1. **Health Check**: `GET /health`
2. **Get Presets**: `GET /presets`
3. **Process Image**: `POST /process`
4. **Process from URL**: `POST /process-url`

### Usage Examples:

```bash
# Health check
curl https://your-service-url/health

# Process image
curl -X POST \
  -F "image=@photo.jpg" \
  -F "preset=default" \
  https://your-service-url/process \
  --output processed-photo.png

# Available presets: default, brighten, subtle, vibrant, natural
```

## Testing the Deployment

```bash
# 1. Test health endpoint
curl https://your-service-url/health

# 2. Test image processing
curl -X POST \
  -F "image=@test-image.jpg" \
  -F "preset=default" \
  https://your-service-url/process \
  --output result.png

# 3. Check if result.png was created and looks correct
```

## Integration with Existing Systems

### JavaScript/Web Frontend
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('preset', 'default');

const response = await fetch('https://your-service-url/process', {
  method: 'POST',
  body: formData
});

const processedImageBlob = await response.blob();
```

### Firebase Function Proxy (Optional)
If you want to keep Firebase Functions as a gateway:

```javascript
const functions = require('firebase-functions');

const CLOUD_RUN_URL = 'https://your-service-url';

exports.processImage = functions
  .runWith({ memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }

    try {
      const response = await fetch(`${CLOUD_RUN_URL}/process`, {
        method: req.method,
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

## Cost Estimates

**Cloud Run Pricing (us-central1):**
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per 1M requests

**Example Monthly Cost (1000 image processes/month, 5 seconds each):**
- CPU: 1000 × 5 × 2 × $0.00002400 = $0.24
- Memory: 1000 × 5 × 2 × $0.00000250 = $0.025
- Requests: 1000 × $0.40/1M = $0.0004
- **Total: ~$0.27/month** for 1000 images

## Benefits Over Firebase Functions

✅ **Deployment Success**: No more 467MB size limit failures  
✅ **Better Performance**: Faster cold starts, longer warm periods  
✅ **More Resources**: Up to 8GB memory, 4 vCPUs available  
✅ **Better Debugging**: Standard Docker environment  
✅ **Cost Effective**: Pay only for actual processing time  
✅ **Scalability**: Handles traffic spikes automatically  

## Monitoring & Logs

```bash
# View service logs
gcloud run services logs read image-processor --region us-central1

# Monitor service metrics
# Go to: Google Cloud Console → Cloud Run → image-processor → Metrics
```

## Rollback Plan

If issues arise, you can:

1. **Revert to previous version**:
   ```bash
   gcloud run services replace-traffic image-processor --to-revisions=REVISION_NAME=100
   ```

2. **Delete the service**:
   ```bash
   gcloud run services delete image-processor --region us-central1
   ```

## Support & Troubleshooting

### Common Issues:

1. **Build Fails**: Check Dockerfile and dependencies
2. **Memory Issues**: Increase memory allocation
3. **Timeout**: Increase timeout settings
4. **Permission Errors**: Check IAM roles

### Debug Commands:
```bash
# Check service status
gcloud run services describe image-processor --region us-central1

# View recent logs
gcloud run services logs tail image-processor --region us-central1
```

## Next Steps After Deployment

1. **Test thoroughly** with various image types and presets
2. **Update client applications** to use the new Cloud Run URL
3. **Monitor performance** and costs in Google Cloud Console
4. **Set up alerts** for service health and error rates
5. **Consider CDN** if serving images globally

---

**Deployment Time**: ~5-10 minutes  
**Expected Outcome**: Fully functional image processing API with face detection  
**Service URL**: Will be provided after deployment completes 