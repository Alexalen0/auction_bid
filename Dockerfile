# Multi-stage build for React + Node.js application

# Stage 1: Build React frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies (omit dev deps in CI)
RUN npm ci --omit=dev

# Copy client source code
COPY client/ ./

# Build the React app
RUN npm run build

# Stage 2: Setup Node.js backend and serve the application
FROM node:18-alpine

ENV NODE_ENV=production

# Install necessary packages for Puppeteer and healthcheck
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy server source code
COPY server/ ./server/

# Copy built React app from frontend-build stage
COPY --from=frontend-build /app/client/build ./client/build

# Create necessary directories
RUN mkdir -p server/invoices server/uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server/server.js"]
