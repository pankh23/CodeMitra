FROM node:18-alpine

# Install Docker CLI for code execution
RUN apk add --no-cache docker-cli

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001

# Change ownership of the app directory
RUN chown -R worker:nodejs /app

# Switch to non-root user
USER worker

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]
