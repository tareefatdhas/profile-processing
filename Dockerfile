# Use Node.js 18 slim image for smaller size
FROM node:18-slim

# Install system dependencies required for Sharp, Canvas, and TensorFlow
RUN apt-get update && apt-get install -y \
    # For Sharp image processing
    libvips-dev \
    # For Canvas
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Build tools for native modules
    python3 \
    make \
    g++ \
    # Cleanup to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install root dependencies (minimal)
RUN npm ci --only=production

# Copy function package files
COPY functions/package*.json ./functions/

# Install function dependencies
WORKDIR /app/functions
RUN npm ci --only=production

# Go back to app root
WORKDIR /app

# Copy the entire source code
COPY . .

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port Cloud Run expects
EXPOSE 8080

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "app.js"] 