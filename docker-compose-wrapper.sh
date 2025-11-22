#!/bin/bash
# Docker Compose Wrapper với auto cleanup
# Sử dụng: ./docker-compose-wrapper.sh [docker-compose commands]

set -e

# Màu sắc
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kiểm tra xem có phải build command không
IS_BUILD=false
CLEANUP_BEFORE_BUILD=true

for arg in "$@"; do
    if [[ "$arg" == "build" ]] || [[ "$arg" == "up" ]] || [[ "$arg" == "up --build" ]]; then
        IS_BUILD=true
        break
    fi
    # Nếu có flag --no-cleanup thì skip cleanup
    if [[ "$arg" == "--no-cleanup" ]]; then
        CLEANUP_BEFORE_BUILD=false
    fi
done

# Nếu là build và cần cleanup
if [ "$IS_BUILD" = true ] && [ "$CLEANUP_BEFORE_BUILD" = true ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Docker Cleanup (trước khi build)${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Kiểm tra dung lượng trước
    echo -e "${YELLOW}📊 Dung lượng trước khi dọn:${NC}"
    docker system df 2>/dev/null || echo "Không thể kiểm tra (có thể Docker chưa chạy)"
    echo ""
    
    # Dọn build cache (an toàn và giải phóng nhiều nhất)
    echo -e "${YELLOW}🧹 Đang dọn build cache...${NC}"
    docker builder prune -af 2>/dev/null || echo "Không thể dọn build cache"
    echo ""
    
    # Dọn images không dùng (an toàn)
    echo -e "${YELLOW}🧹 Đang dọn images không dùng...${NC}"
    docker image prune -af 2>/dev/null || echo "Không thể dọn images"
    echo ""
    
    # Kiểm tra dung lượng sau
    echo -e "${GREEN}📊 Dung lượng sau khi dọn:${NC}"
    docker system df 2>/dev/null || true
    echo ""
    
    echo -e "${GREEN}✅ Cleanup hoàn thành!${NC}"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Bắt đầu docker compose...${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
fi

# Loại bỏ --no-cleanup flag nếu có
ARGS=()
for arg in "$@"; do
    if [[ "$arg" != "--no-cleanup" ]]; then
        ARGS+=("$arg")
    fi
done

# Chạy docker compose với các arguments
docker compose "${ARGS[@]}"

