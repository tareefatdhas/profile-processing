# Quick Deploy Guide - Image Processing Service

## Problem Solved
✅ Firebase Functions deployment failing (467MB dependencies)  
✅ Migrated to Google Cloud Run (handles any size)  

## One-Command Deployment

```bash
gcloud run deploy image-processor \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --allow-unauthenticated \
  --port 8080
```

## What You Get
- **URL**: `https://image-processor-[hash]-uc.a.run.app`
- **API**: Same endpoints as before, but working
- **Cost**: ~$0.27/month for 1000 images
- **Performance**: Better than Firebase Functions

## Test After Deployment
```bash
# Health check
curl https://your-service-url/health

# Process image
curl -X POST -F "image=@test.jpg" -F "preset=default" \
  https://your-service-url/process --output result.png
```

## Files Created
- `app.js` - Express server
- `Dockerfile` - Container configuration
- `package.json` - Updated dependencies
- `.dockerignore` - Build optimization

**Ready to deploy!** 🚀 