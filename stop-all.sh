#!/bin/bash

# Script để stop tất cả services
# Usage: ./stop-all.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Stopping All Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to kill process by PID file
kill_by_pidfile() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if kill -0 $PID 2>/dev/null; then
            echo -e "${GREEN}Stopping $2 (PID: $PID)...${NC}"
            kill $PID
            rm "$1"
        else
            echo -e "${GREEN}$2 already stopped${NC}"
            rm "$1"
        fi
    else
        echo -e "${GREEN}$2 not running (no PID file)${NC}"
    fi
}

# Create logs directory if not exists
mkdir -p logs

# Stop services by PID files
kill_by_pidfile "logs/frontend.pid" "Frontend"
kill_by_pidfile "logs/hocuspocus.pid" "Hocuspocus Server"
kill_by_pidfile "logs/core-service.pid" "Core Service"
kill_by_pidfile "logs/ai-service.pid" "AI Service"

echo ""

# Stop by ports (backup method)
echo -e "${GREEN}Checking ports...${NC}"

kill_port() {
    if lsof -ti:$1 >/dev/null 2>&1; then
        echo -e "${GREEN}Killing process on port $1...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    fi
}

kill_port 5173  # Frontend
kill_port 3002  # Hocuspocus
kill_port 8989  # Core Service
kill_port 8000  # AI Service

echo ""

# Check docker permissions
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker-compose"
    else
        DOCKER_CMD="docker-compose"
    fi
else
    DOCKER_CMD="docker-compose"
fi

# Stop Docker containers
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Stopping Docker Containers${NC}"
echo -e "${BLUE}========================================${NC}"
$DOCKER_CMD down
echo -e "${GREEN}✓ Docker containers stopped${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   All Services Stopped${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
