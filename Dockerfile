# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S -u 1001 -G appuser appuser

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:appuser . .

# Create necessary directories
RUN mkdir -p data logs && \
    chown -R appuser:appuser data logs

# Switch to non-root user
USER appuser

# Expose health check port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the bot
CMD ["node", "index.js"]
