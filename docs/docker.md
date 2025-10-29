# Docker Deployment Guide

Complete guide for building, running, and deploying QA Toolsmith using Docker.

## Quick Start

### Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose (optional, for local development)
- Configured Supabase environment variables

### Minimal Setup

```bash
# 1. Clone the repository
git clone https://github.com/jakub-litkowski/qa-toolsmith.git
cd qa-toolsmith

# 2. Configure environment variables
cp .env.docker.example .env
# Edit .env with your Supabase credentials

# 3. Build and run
docker-compose up -d

# 4. Verify
curl http://localhost:3000/api/health
```

## Environment Variables

### Required Variables

| Variable       | Description                   | Example                                   |
| -------------- | ----------------------------- | ----------------------------------------- |
| `SUPABASE_URL` | Your Supabase project URL     | `https://xxxxx.supabase.co`               |
| `SUPABASE_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

| Variable                  | Description                                       | Default      |
| ------------------------- | ------------------------------------------------- | ------------ |
| `SUPABASE_SERVICE_KEY`    | Service role key for admin operations             | -            |
| `OPENROUTER_API_KEY`      | AI assistant integration key                      | -            |
| `AUTH_RESET_REDIRECT_URL` | Password reset redirect URL                       | -            |
| `ENV_NAME`                | Environment name (local, integration, production) | `production` |
| `PORT`                    | Server port                                       | `3000`       |

### Example .env File

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Feature Flags
ENV_NAME=production

# AI Integration (Optional)
OPENROUTER_API_KEY=your-openrouter-key-here

# Auth Configuration (Optional)
AUTH_RESET_REDIRECT_URL=https://qa-toolsmith.pages.dev/auth/reset/confirm
```

## Building the Image

### Local Build

```bash
# Standard build
docker build -t jayleetwan/qa-toolsmith:latest .

# Build with custom environment name
docker build --build-arg PUBLIC_ENV_NAME=integration -t jayleetwan/qa-toolsmith:latest .

# Clean build (no cache)
docker build --no-cache -t jayleetwan/qa-toolsmith:latest .
```

### Build with Metadata

```bash
docker build \
  --label "org.opencontainers.image.source=https://github.com/jakub-litkowski/qa-toolsmith" \
  --label "org.opencontainers.image.description=QA Toolsmith - Open-source testing tools for software testers" \
  -t ghcr.io/jayleetwan/qa-toolsmith:latest \
  .
```

## Running Containers

### Option A: Docker Compose (Recommended)

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop and remove
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

### Option B: Docker Run

```bash
# Basic run with env file
docker run -d \
  --name qa-toolsmith \
  -p 3000:3000 \
  --env-file .env \
  jayleetwan/qa-toolsmith:latest

# Run with inline environment variables
docker run -d \
  --name qa-toolsmith \
  -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_KEY=your-anon-key \
  -e ENV_NAME=production \
  jayleetwan/qa-toolsmith:latest

# Run with custom port
docker run -d \
  --name qa-toolsmith \
  -p 8080:3000 \
  --env-file .env \
  jayleetwan/qa-toolsmith:latest
```

### Managing Containers

```bash
# Check status
docker ps | grep qa-toolsmith

# View logs
docker logs qa-toolsmith
docker logs -f qa-toolsmith  # Follow logs

# Restart container
docker restart qa sequential

# Stop container
docker stop qa-toolsmith

# Remove container
docker rm qa-toolsmith

# Execute commands inside container
docker exec -it qa-toolsmith sh
docker exec qa-toolsmith env | grep SUPABASE
```

## GitHub Container Registry

### Push to Registry

```bash
# 1. Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u jayleetwan --password-stdin

# 2. Build and tag
docker build -t ghcr.io/jayleetwan/qa-toolsmith:latest .

# 3. Push to registry
docker push ghcr.io/jayleetwan/qa-toolsmith:latest
```

### Pull and Run from Registry

```bash
# Pull from registry
docker pull ghcr.io/jayleetwan/qa-toolsmith:latest

# Tag for convenience
docker tag ghcr.io/jayleetwan/qa-toolsmith:latest jayleetwan/qa-toolsmith:latest

# Run as usual
docker run -d \
  --name qa-toolsmith \
  -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_KEY=your-anon-key \
  jayleetwan/qa-toolsmith:latest
```

## Architecture & Security

### Multi-Stage Build

The Dockerfile uses a two-stage build for optimized image size and security:

**Stage 1 - Builder:**

- Installs all dependencies (dev + production)
- Builds application with Node.js adapter
- Generates production artifacts

**Stage 2 - Runner:**

- Only production dependencies (~200MB vs ~600MB)
- Non-root user (`nodejs:1001`)
- Alpine Linux base for minimal attack surface
- Health check enabled

### Security Features

✅ **Runtime secrets only** - No secrets baked into image layers  
✅ **Non-root execution** - Runs as `nodejs:1001` user  
✅ **Alpine Linux** - Minimal base image with reduced attack surface  
✅ **Production dependencies only** - Dev tools excluded from final image  
✅ **Health checks** - Built-in monitoring at `/api/health`  
✅ **No secrets in history** - Docker history shows no credential traces

### Security Verification

```bash
# Verify dummy values not in final image
docker history jayleetwan/qa-toolsmith:latest | grep placeholder
# Should return nothing

# Check for security warnings
docker build . 2>&1 | grep -i "secret"
# Should return nothing

# Verify runtime secrets
docker exec qa-toolsmith env | grep SUPABASE
# Should show real values
```

## Health Checks

The container includes a built-in health check:

```bash
# Check health status
docker ps --filter "name=qa-toolsmith"

# View detailed health check logs
docker inspect --format='{{json uniqu .State.Health}}' qa-toolsmith | jq

# Manual health check
curl http://localhost:3000/api/health
```

Health check returns:

- HTTP 200: Container is healthy
- HTTP 500: Container is unhealthy

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs for errors
docker logs qa-toolsmith

# Common causes:
# - Missing SUPABASE_URL or SUPABASE_KEY
# - Invalid Supabase credentials
# - Port already in use
```

### Connection Refused

```bash
# Verify container is running
docker ps

# Check port binding
docker port qa-toolsmith

# Test internal connectivity
docker exec qa-toolsmith wget -O- http://localhost:3000/api/health
```

### Build Fails

```bash
# Clean build cache
docker builder prune

# Rebuild with verbose output
docker build --progress=plain -t jayleetwan/qa-toolsmith:latest .

# Check Dockerfile syntax
docker build --target builder -t qa-toolsmith-builder .
```

### Environment Variables Not Applied

```bash
# Verify variables inside container
docker exec qa-toolsmith printenv | grep SUPABASE

# Check .env file syntax
cat .env | grep -v '^#' | grep -v '^$'

# Ensure no whitespace around '='
SUPABASE_URL=https://example.com  # ✅ Correct
SUPABASE_URL = https://example.com  # ❌ Wrong
```

### Complete Cleanup and Rebuild

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker rmi jayleetwan/qa-toolsmith:latest

# Clean build cache
docker builder prune

# Rebuild from scratch
docker-compose up -d --build
```

## Production Deployment

### Cloud Deployment Options

The Docker image is production-ready and secure for:

**DigitalOcean App Platform:**

```bash
# Set environment variables in App Platform dashboard
# Image: ghcr.io/jayleetwan/qa-toolsmith:latest
# Secrets injected securely at runtime
```

**AWS ECS / Fargate:**

- Use task definition environment variables
- No secrets in container image
- IAM roles for additional security

**Azure Container Instances:**

- Environment variables in container group
- Not in image metadata
- Production-grade security

**Google Cloud Run:**

- Secrets Manager integration
- Environment variables at runtime
- Secure by default

### Resource Recommendations

```yaml
# docker-compose.yml example
services:
  qa-toolsmith:
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
```

### Networking

- Container binds to `0.0.0.0:PORT` for external access
- Port configurable via `PORT` environment variable
- Use reverse proxy (nginx, Traefik) for production domains
- Health check available at `/api/health`

## Development Workflow

```bash
# Start development environment
docker-compose up -d

# Watch logs
docker-compose logs -f

# Make code changes locally (volume mounted in dev mode)

# Restart to pick up changes
docker-compose restart

# Run tests inside container
docker-compose exec qa-toolsmith npm test

# Access container shell
docker-compose exec qa-toolsmith sh
```

## Command Reference

| Task    | Command                                 |
| ------- | --------------------------------------- |
| Start   | `docker-compose up -d`                  |
| Stop    | `docker-compose down`                   |
| Logs    | `docker-compose logs -f`                |
| Restart | `docker-compose restart`                |
| Rebuild | `docker-compose up -d --build`          |
| Health  | `curl http://localhost:3000/api/health` |
| Shell   | `docker-compose exec qa-toolsmith sh`   |
