FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk add --no-cache dumb-init tzdata && \
    apk upgrade --no-cache

# Create app directory and user
RUN mkdir -p /tmp/actual && \
    addgroup -g 1001 -S nodejs && \
    adduser -S actualapi -u 1001

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Change ownership to non-root user
RUN chown -R actualapi:nodejs /usr/src/app /tmp/actual

# Switch to non-root user
USER actualapi

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 8080, path: '/api/healthcheck', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]