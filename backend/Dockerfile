# Multi-stage build for TypeScript compilation
FROM node:18-alpine AS builder

# Install dependencies for native modules and OpenSSL
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm install

# Install tsconfig-paths and tsc-alias for path resolution
RUN npm install --save-dev tsconfig-paths tsc-alias

# Copy prisma schema 
COPY prisma ./prisma

# Copy source code
COPY backend/src ./src

# Generate Prisma client
RUN npx prisma generate

# Build the application and resolve path aliases
RUN npm run build && npx tsc-alias -p tsconfig.json

# Production stage
FROM node:18-alpine AS runner

# Install curl for health checks and OpenSSL for Prisma
RUN apk add --no-cache curl openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy prisma schema and generate client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Change ownership of the app directory
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/healthz || exit 1

# Start the application
CMD ["npm", "start"]
