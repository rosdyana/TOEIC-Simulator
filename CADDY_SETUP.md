# Caddy Reverse Proxy Setup Guide

This guide explains how to set up TOEIC Simulation behind a Caddy reverse proxy.

## Prerequisites

- Caddy installed and running
- Docker and Docker Compose installed
- Domain name configured (optional, can use IP)

## Step 1: Configure Docker Network

If Caddy is running in Docker, create a shared network:

```bash
docker network create caddy-network
```

If Caddy is running on the host (not in Docker), skip this step.

## Step 2: Start the Container

1. **Set the port** (default is 8080):
   ```bash
   echo "TOEIC_PORT=8080" > .env
   ```

2. **Start the container:**
   ```bash
   docker-compose up -d
   ```

3. **Verify it's running:**
   ```bash
   docker ps | grep toeic-simulation
   curl http://localhost:8080/health
   ```

## Step 3: Configure Caddy

### Option A: Caddy in Docker (Recommended)

If Caddy is running in Docker, add to your Caddyfile:

```caddy
toeic.example.com {
    reverse_proxy toeic-simulation:8080 {
        health_uri /health
        health_interval 30s
    }
    
    encode gzip
    
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }
}
```

Make sure both containers are on the same network:
```yaml
# In your Caddy docker-compose.yml
networks:
  - caddy-network

# In toeic-simulation docker-compose.yml (already configured)
networks:
  - caddy-network
```

### Option B: Caddy on Host

If Caddy is running on the host (not in Docker), use:

```caddy
toeic.example.com {
    reverse_proxy localhost:8080 {
        health_uri /health
        health_interval 30s
    }
    
    encode gzip
    
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }
}
```

## Step 4: Reload Caddy

```bash
# If Caddy is in Docker
docker exec caddy caddy reload

# If Caddy is on host
caddy reload
```

## Step 5: Verify

1. **Check health endpoint:**
   ```bash
   curl https://toeic.example.com/health
   ```

2. **Access the application:**
   Open `https://toeic.example.com` in your browser

## Configuration Options

### Using a Subpath

If you want to serve the app on a subpath (e.g., `example.com/toeic`):

```caddy
example.com {
    reverse_proxy /toeic/* toeic-simulation:8080 {
        rewrite /toeic /strip_prefix=/toeic
    }
}
```

**Note:** You'll also need to configure the base path in Vite. Update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/toeic/',
  // ... rest of config
})
```

### Custom Port

To use a different port, update `.env`:

```bash
TOEIC_PORT=3000
```

Then update your Caddyfile:

```caddy
toeic.example.com {
    reverse_proxy toeic-simulation:3000
}
```

### Multiple Services

If you have multiple services behind Caddy:

```caddy
# Main service
example.com {
    reverse_proxy main-service:80
}

# TOEIC Simulation
toeic.example.com {
    reverse_proxy toeic-simulation:8080
}

# Another service
api.example.com {
    reverse_proxy api-service:3000
}
```

## Troubleshooting

### Container not reachable from Caddy

1. **Check if containers are on the same network:**
   ```bash
   docker network inspect caddy-network
   ```

2. **Check container name:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Ports}}"
   ```
   Make sure the name in Caddyfile matches the container name.

3. **Test connectivity:**
   ```bash
   # From Caddy container
   docker exec caddy wget -O- http://toeic-simulation:8080/health
   
   # From host
   curl http://localhost:8080/health
   ```

### Port conflicts

If port 8080 is already in use:

1. **Change the port in `.env`:**
   ```bash
   TOEIC_PORT=3000
   ```

2. **Update Caddyfile:**
   ```caddy
   reverse_proxy toeic-simulation:3000
   ```

3. **Restart:**
   ```bash
   docker-compose down
   docker-compose up -d
   caddy reload
   ```

### SSL/HTTPS Issues

Caddy automatically handles SSL certificates. If you have issues:

1. **Check Caddy logs:**
   ```bash
   docker logs caddy
   ```

2. **Verify domain DNS:**
   ```bash
   dig toeic.example.com
   ```

3. **Check Caddyfile syntax:**
   ```bash
   caddy validate --config /path/to/Caddyfile
   ```

## Security Considerations

1. **Firewall:** Only expose port 80/443 on the host. The container port (8080) should only be accessible internally.

2. **Network isolation:** Use Docker networks to isolate services.

3. **Rate limiting:** Add rate limiting in Caddy if needed:
   ```caddy
   toeic.example.com {
       rate_limit {
           zone dynamic {
               key {remote_host}
               events 100
               window 1m
           }
       }
       
       reverse_proxy toeic-simulation:8080
   }
   ```

## Monitoring

Add logging to monitor requests:

```caddy
toeic.example.com {
    log {
        output file /var/log/caddy/toeic.log
        format json
    }
    
    reverse_proxy toeic-simulation:8080
}
```

