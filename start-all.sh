#!/bin/bash

# Script để start tất cả services cho Naver Hackathon 2025
# Usage: ./start-all.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Naver Hackathon 2025 - Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port in use
    else
        return 1  # Port free
    fi
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠ Port $1 is in use, killing process...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Docker requires sudo. Checking if sudo works...${NC}"
    if sudo docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Will use sudo for docker commands${NC}"
        DOCKER_CMD="sudo docker-compose"
    else
        echo -e "${RED}✗ Docker permission denied. Please run: sudo usermod -aG docker \$USER${NC}"
        echo -e "${RED}  Then logout and login again.${NC}"
        exit 1
    fi
else
    DOCKER_CMD="docker-compose"
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found${NC}"

if ! command -v java &> /dev/null; then
    echo -e "${RED}✗ Java not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java found${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

echo ""

# Start Docker containers
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}1. Starting Docker Containers${NC}"
echo -e "${BLUE}========================================${NC}"
$DOCKER_CMD up -d postgres redis
echo -e "${GREEN}✓ PostgreSQL and Redis started${NC}"
echo ""

# Wait for databases
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 5
echo -e "${GREEN}✓ Databases ready${NC}"
echo ""

# Create logs directory
mkdir -p logs

# Clean up ports if needed
echo -e "${YELLOW}Cleaning up ports if necessary...${NC}"
kill_port 8000
kill_port 8989
kill_port 3002
kill_port 5173
echo ""

# Start Backend AI Service
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}2. Starting Backend AI Service (Port 8000)${NC}"
echo -e "${BLUE}========================================${NC}"

cd backend-ai-service

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate venv and start service in background
source venv/bin/activate
nohup uvicorn api.main:app --host 0.0.0.0 --port 8000 > ../logs/ai-service.log 2>&1 &
AI_PID=$!
echo $AI_PID > ../logs/ai-service.pid

echo -e "${GREEN}✓ Backend AI Service starting (PID: $AI_PID)${NC}"
echo -e "${YELLOW}  Logs: logs/ai-service.log${NC}"
cd ..
echo ""

# Start Backend Core Service
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}3. Starting Backend Core Service (Port 8989)${NC}"
echo -e "${BLUE}========================================${NC}"

cd backend-core-service/be-core

# Start Spring Boot in background
nohup ./mvnw spring-boot:run > ../../logs/core-service.log 2>&1 &
CORE_PID=$!
echo $CORE_PID > ../../logs/core-service.pid

echo -e "${GREEN}✓ Backend Core Service starting (PID: $CORE_PID)${NC}"
echo -e "${YELLOW}  Logs: logs/core-service.log${NC}"
cd ../..
echo ""

# Start Hocuspocus Server
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}4. Starting Hocuspocus Server (Port 3002)${NC}"
echo -e "${BLUE}========================================${NC}"

cd hocuspocus-server

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

nohup npm start > ../logs/hocuspocus.log 2>&1 &
HOCUS_PID=$!
echo $HOCUS_PID > ../logs/hocuspocus.pid

echo -e "${GREEN}✓ Hocuspocus Server starting (PID: $HOCUS_PID)${NC}"
echo -e "${YELLOW}  Logs: logs/hocuspocus.log${NC}"
cd ..
echo ""

# Start Frontend
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}5. Starting Frontend (Port 5173)${NC}"
echo -e "${BLUE}========================================${NC}"

cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid

echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}  Logs: logs/frontend.log${NC}"
cd ..
echo ""

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check services
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Service Status${NC}"
echo -e "${BLUE}========================================${NC}"

check_service() {
    if curl -s -o /dev/null -w "%{http_code}" $1 | grep -q $2; then
        echo -e "${GREEN}✓ $3 is running${NC}"
    else
        echo -e "${YELLOW}⚠ $3 is starting... (check logs)${NC}"
    fi
}

check_service "http://localhost:8000/api/v1/health" "200" "AI Service"
check_service "http://localhost:8989/api/tasks" "200\|401" "Core Service"
check_service "http://localhost:5173" "200" "Frontend"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}All Services Started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Service URLs:${NC}"
echo -e "  Frontend:     ${YELLOW}http://localhost:5173${NC}"
echo -e "  Core Backend: ${YELLOW}http://localhost:8989${NC}"
echo -e "  AI Backend:   ${YELLOW}http://localhost:8000${NC}"
echo -e "  AI Docs:      ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "  Hocuspocus:   ${YELLOW}ws://localhost:3002${NC}"
echo ""
echo -e "${GREEN}Process IDs:${NC}"
echo -e "  AI Service:   $AI_PID"
echo -e "  Core Service: $CORE_PID"
echo -e "  Hocuspocus:   $HOCUS_PID"
echo -e "  Frontend:     $FRONTEND_PID"
echo ""
echo -e "${YELLOW}To stop all services, run:${NC} ./stop-all.sh"
echo -e "${YELLOW}To view logs, check the 'logs/' directory${NC}"
echo ""
