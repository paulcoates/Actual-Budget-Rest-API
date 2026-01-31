FROM node:24.11.1-alpine AS builder

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
FROM node:24.11.1-alpine

ENV NODE_ENV=production

# Install system dependencies
RUN apk add --no-cache dumb-init tzdata

# Create data directory
RUN mkdir -p /tmp/actual

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S actualapi -u 1001

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set permissions for the app user
RUN chown -R actualapi:nodejs /usr/src/app /tmp/actual

# Switch to non-root user for security
USER actualapi

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 8080, path: '/api/healthcheck', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Start the application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]
