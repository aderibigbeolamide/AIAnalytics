# # Multi-stage Dockerfile for EventValidate
# # Stage 1: Build stage
# FROM node:18-alpine AS builder

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY pnpm-lock.yaml ./

# # Install pnpm
# RUN npm install -g pnpm

# # Install dependencies (handle lockfile mismatches)
# RUN pnpm install

# # Copy source code
# COPY . .

# # Build the application
# RUN pnpm run build

# # Stage 2: Production stage
# FROM node:18-alpine AS production

# # Install dumb-init for proper signal handling
# RUN apk add --no-cache dumb-init

# # Create app user
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S eventvalidate -u 1001

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY pnpm-lock.yaml ./

# # Install pnpm
# RUN npm install -g pnpm

# # Install only production dependencies
# RUN pnpm install --prod

# # Copy built application from builder stage
# COPY --from=builder --chown=eventvalidate:nodejs /app/dist ./dist
# COPY --from=builder --chown=eventvalidate:nodejs /app/client/dist ./client/dist

# # Copy other necessary files
# COPY --chown=eventvalidate:nodejs shared ./shared
# COPY --chown=eventvalidate:nodejs config ./config
# COPY --chown=eventvalidate:nodejs server ./server
# COPY --chown=eventvalidate:nodejs migrations ./migrations

# # Create uploads directory
# RUN mkdir -p uploads && chown eventvalidate:nodejs uploads

# # Switch to non-root user
# USER eventvalidate

# # Expose port
# EXPOSE 5000

# # Health check
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# # Use dumb-init to handle signals properly
# ENTRYPOINT ["dumb-init", "--"]

# # Start the application
# CMD ["npm", "start"]
# Simple single-stage Dockerfile for EventValidate
FROM node:18-alpine

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
# Install curl
RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
  
# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
