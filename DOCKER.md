# Docker Deployment Guide

This guide explains how to deploy the TOEIC Test Simulator using Docker.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later (optional, for docker-compose)

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker Commands

1. **Build the image:**
   ```bash
   docker build -t toeic-simulation:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name toeic-simulation \
     -p 80:80 \
     --restart unless-stopped \
     toeic-simulation:latest
   ```

3. **View logs:**
   ```bash
   docker logs -f toeic-simulation
   ```

4. **Stop the container:**
   ```bash
   docker stop toeic-simulation
   docker rm toeic-simulation
   ```

## Custom Port

The default configuration uses port 8080 to avoid conflicts with other services. To use a different port:

**Using Environment Variable:**
```bash
# Create .env file
echo "TOEIC_PORT=8080" > .env

# Or set it when running
TOEIC_PORT=3000 docker-compose up -d
```

**Docker Compose (edit docker-compose.yml):**
```yaml
ports:
  - "8080:80"  # Change 8080 to your desired port
```

**Docker Command:**
```bash
docker run -d -p 8080:80 --name toeic-simulation toeic-simulation:latest
```

## Production Deployment

### Using Docker Compose with Caddy

1. **Set the port in `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env and set TOEIC_PORT=8080 (or your preferred port)
   ```

2. **Create Docker network for Caddy (if needed):**
   ```bash
   docker network create caddy-network
   ```

3. **Start the container:**
   ```bash
   docker-compose up -d
   ```

4. **Configure Caddy** (see `Caddyfile.example`):
   - Add the reverse proxy configuration to your Caddyfile
   - Update the domain name
   - Reload Caddy: `caddy reload`

### Using Docker Compose with Production Override

1. **Use the production override file:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

This applies resource limits and logging configuration for production.

### Using Caddy Reverse Proxy

If you're using Caddy as a reverse proxy (recommended for production):

1. **Create a Docker network for Caddy (if not exists):**
   ```bash
   docker network create caddy-network
   ```

2. **Start the container:**
   ```bash
   docker-compose up -d
   ```

3. **Add to your Caddyfile** (see `Caddyfile.example`):
   ```caddy
   toeic.example.com {
       reverse_proxy toeic-simulation:8080 {
           health_uri /health
       }
   }
   ```

4. **Reload Caddy:**
   ```bash
   caddy reload
   ```

The container will be accessible through Caddy on your domain with automatic HTTPS.

**Note:** Make sure the container name (`toeic-simulation`) and port (`8080`) match in your Caddyfile.

### Using Other Reverse Proxies (Nginx/Traefik)

If you're using another reverse proxy, you can run the container without exposing ports to the host:

```yaml
services:
  toeic-simulation:
    expose:
      - "80"
    # Remove or comment out ports section
```

Then configure your reverse proxy to forward to `toeic-simulation:80` (internal Docker network).

## Health Check

The container includes a health check endpoint at `/health`. You can verify it's working:

```bash
curl http://localhost/health
```

## Troubleshooting

### Container won't start

1. **Check logs:**
   ```bash
   docker logs toeic-simulation
   ```

2. **Verify port availability:**
   ```bash
   # Check if port 80 is in use
   netstat -tuln | grep :80
   # or
   lsof -i :80
   ```

### Build fails

1. **Clear Docker cache:**
   ```bash
   docker builder prune -a
   ```

2. **Rebuild without cache:**
   ```bash
   docker build --no-cache -t toeic-simulation:latest .
   ```

### Application not loading

1. **Check if container is running:**
   ```bash
   docker ps | grep toeic-simulation
   ```

2. **Check nginx configuration:**
   ```bash
   docker exec toeic-simulation nginx -t
   ```

3. **Restart the container:**
   ```bash
   docker restart toeic-simulation
   ```

## Updating the Application

1. **Pull latest code:**
   ```bash
   git pull
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose up -d --build
   ```

## Image Size Optimization

The multi-stage build already optimizes the image size. The final image only contains:
- Nginx Alpine (~5MB)
- Built static files

Total image size should be around 20-30MB.

## Security Considerations

1. **Run as non-root user** (already handled by nginx:alpine)
2. **Keep Docker and images updated**
3. **Use HTTPS in production** (configure SSL/TLS in nginx)
4. **Set resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```

## Environment Variables

Since this is a client-side application, environment variables should be set at build time. To customize the build:

1. Create a `.env.production` file
2. Modify the Dockerfile to use it:
   ```dockerfile
   ARG VITE_API_URL
   ENV VITE_API_URL=$VITE_API_URL
   ```

3. Build with:
   ```bash
   docker build --build-arg VITE_API_URL=https://api.example.com -t toeic-simulation .
   ```

