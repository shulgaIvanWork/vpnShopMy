# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vpnbot -u 1001

# Change ownership of the app directory
RUN chown -R vpnbot:nodejs /app
USER vpnbot

# Create videos directory
RUN mkdir -p /app/videos

# Expose port (if using webhook)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the bot
CMD ["node", "index.js"]
