# Multi-stage Dockerfile for QA Toolsmith
# Stage 1: Build stage with all dependencies

FROM node:22-alpine AS builder

# Build-time metadata
LABEL maintainer="jayleetwan"
LABEL description="QA Toolsmith - Open-source testing tools for software testers"
LABEL org.opencontainers.image.source="https://github.com/jakub-litkowski/qa-toolsmith"

# Build-time arguments
ARG PUBLIC_ENV_NAME=local
ARG NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies (production + dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=${NODE_ENV}
ENV PUBLIC_ENV_NAME=${PUBLIC_ENV_NAME}
ENV ASTRO_TARGET=node

# Build the application with Node adapter (not Cloudflare)
# Using dummy values ONLY for build-time validation (disable secrets validation)
# These values are NOT baked into the final image
RUN SUPABASE_URL="https://placeholder.supabase.co" SUPABASE_KEY="placeholder-key" npm run build:node

# Stage 2: Production stage with minimal dependencies

FROM node:22-alpine AS runner

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for runtime dependency installation
COPY package.json package-lock.json ./

# Install production dependencies including dotenv (needed by preview.js)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Switch to non-root user
USER nodejs

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default environment variables (can be overridden via -e at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "scripts/preview.js"]

