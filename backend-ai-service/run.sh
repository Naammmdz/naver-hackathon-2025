#!/bin/bash

# Script để chạy AI Service
# Usage: ./run.sh [port]

set -e

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Port mặc định
PORT=${1:-8000}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   AI Service Startup Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Kiểm tra Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 không được tìm thấy${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found${NC}"

# Kiểm tra virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠ Virtual environment chưa được tạo${NC}"
    echo -e "${YELLOW}  Tạo virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment đã được tạo${NC}"
fi

# Kích hoạt virtual environment
echo -e "${YELLOW}Kích hoạt virtual environment...${NC}"
source venv/bin/activate

# Kiểm tra dependencies
if ! python3 -c "import fastapi" &> /dev/null; then
    echo -e "${YELLOW}⚠ Dependencies chưa được cài đặt${NC}"
    echo -e "${YELLOW}  Cài đặt dependencies...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies đã được cài đặt${NC}"
else
    echo -e "${GREEN}✓ Dependencies đã được cài đặt${NC}"
fi

# Kiểm tra .env file
if [ ! -f ".env" ]; then
    if [ -f "../.env" ]; then
        echo -e "${YELLOW}⚠ File .env chưa có, nhưng tìm thấy ở thư mục cha${NC}"
        echo -e "${YELLOW}  Tạo symlink tới ../.env...${NC}"
        ln -s ../.env .env
        echo -e "${GREEN}✓ Đã tạo symlink .env${NC}"
    else
        echo -e "${YELLOW}⚠ File .env chưa được tạo${NC}"
        echo -e "${YELLOW}  Tạo file .env từ template...${NC}"
        cat > .env <<EOF
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5439/postgres

# LLM Provider API Keys
CLOVASTUDIO_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
EOF
        echo -e "${GREEN}✓ File .env đã được tạo${NC}"
        echo -e "${YELLOW}⚠ Vui lòng cập nhật file .env với thông tin của bạn${NC}"
    fi
fi

# Kiểm tra database connection
echo -e "${YELLOW}Kiểm tra kết nối database...${NC}"
if python3 -c "from database.connection import test_connection; test_connection()" 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection OK${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}  Vui lòng kiểm tra biến môi trường NEONDB trong file .env${NC}"
    exit 1
fi

# Kiểm tra uvicorn
if ! python3 -c "import uvicorn" &> /dev/null; then
    echo -e "${YELLOW}⚠ Uvicorn chưa được cài đặt, cài đặt...${NC}"
    pip install uvicorn[standard]
fi

# Chạy service
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Starting AI Service on port $PORT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}API Documentation:${NC}"
echo -e "  Swagger UI: http://localhost:$PORT/docs"
echo -e "  ReDoc:      http://localhost:$PORT/redoc"
echo -e "  Health:     http://localhost:$PORT/api/v1/health"
echo ""
echo -e "${YELLOW}Nhấn Ctrl+C để dừng service${NC}"
echo ""

# Chạy uvicorn
python3 -m uvicorn api.main:app --reload --host 0.0.0.0 --port $PORT

