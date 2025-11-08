#!/bin/bash

# TOEIC Simulation Deployment Script
# This script helps deploy the application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

print_success "Docker is installed"

# Check if Docker Compose is installed (optional)
USE_COMPOSE=true
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_info "Docker Compose not found, will use Docker commands directly"
    USE_COMPOSE=false
fi

# Parse command line arguments
ACTION=${1:-build}
PORT=${2:-8080}  # Default to 8080 for reverse proxy compatibility

case $ACTION in
    build)
        print_info "Building Docker image..."
        docker build -t toeic-simulation:latest .
        print_success "Image built successfully"
        ;;
    
    start)
        print_info "Starting container on port $PORT..."
        if [ "$USE_COMPOSE" = true ]; then
            PORT=$PORT docker-compose up -d
        else
            docker run -d \
                --name toeic-simulation \
                -p $PORT:80 \
                --restart unless-stopped \
                toeic-simulation:latest
        fi
        print_success "Container started"
        print_info "Application is available at http://localhost:$PORT"
        ;;
    
    stop)
        print_info "Stopping container..."
        if [ "$USE_COMPOSE" = true ]; then
            docker-compose down
        else
            docker stop toeic-simulation 2>/dev/null || true
            docker rm toeic-simulation 2>/dev/null || true
        fi
        print_success "Container stopped"
        ;;
    
    restart)
        print_info "Restarting container..."
        $0 stop
        sleep 2
        $0 start $PORT
        ;;
    
    logs)
        print_info "Showing container logs..."
        if [ "$USE_COMPOSE" = true ]; then
            docker-compose logs -f
        else
            docker logs -f toeic-simulation
        fi
        ;;
    
    status)
        print_info "Container status:"
        if [ "$USE_COMPOSE" = true ]; then
            docker-compose ps
        else
            docker ps -a | grep toeic-simulation || print_info "Container not running"
        fi
        ;;
    
    update)
        print_info "Updating application..."
        $0 stop
        $0 build
        $0 start $PORT
        print_success "Application updated"
        ;;
    
    clean)
        print_info "Cleaning up..."
        $0 stop
        docker rmi toeic-simulation:latest 2>/dev/null || true
        docker system prune -f
        print_success "Cleanup complete"
        ;;
    
    *)
        echo "Usage: $0 {build|start|stop|restart|logs|status|update|clean} [port]"
        echo ""
        echo "Commands:"
        echo "  build    - Build the Docker image"
        echo "  start    - Start the container (default port: 80)"
        echo "  stop     - Stop the container"
        echo "  restart  - Restart the container"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        echo "  update   - Stop, rebuild, and start the container"
        echo "  clean    - Stop container and remove image"
        echo ""
        echo "Examples:"
        echo "  $0 build"
        echo "  $0 start          # Start on port 8080 (default)"
        echo "  $0 start 3000     # Start on custom port"
        echo "  $0 update"
        exit 1
        ;;
esac

