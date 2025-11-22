FROM node:24.11.1-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Create data directory
RUN mkdir -p /tmp/actual

# Install system dependencies
RUN apk add --no-cache tzdata

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Set permissions for the node user
RUN chown -R node:node /usr/src/app /tmp/actual

# Switch to non-root user for security
USER node

EXPOSE 8080
CMD [ "node", "index.js" ]