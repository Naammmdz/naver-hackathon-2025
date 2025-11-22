#!/bin/bash
# Script để dọn dẹp Docker trên VPS
# Chạy script này trên VPS qua SSH

echo "=========================================="
echo "  Docker Cleanup Script"
echo "=========================================="
echo ""

# Kiểm tra dung lượng trước khi dọn
echo "📊 Dung lượng trước khi dọn:"
docker system df
echo ""

# Dọn build cache (giải phóng nhiều nhất)
echo "🧹 Đang dọn build cache..."
docker builder prune -af
echo ""

# Dọn images không dùng
echo "🧹 Đang dọn images không dùng..."
docker image prune -af
echo ""

# Dọn containers đã dừng
echo "🧹 Đang dọn containers đã dừng..."
docker container prune -f
echo ""

# Dọn volumes không dùng (cẩn thận - có thể mất data)
echo "🧹 Đang dọn volumes không dùng..."
docker volume prune -f
echo ""

# Dọn networks không dùng
echo "🧹 Đang dọn networks không dùng..."
docker network prune -f
echo ""

# Kiểm tra dung lượng sau khi dọn
echo "📊 Dung lượng sau khi dọn:"
docker system df
echo ""

# Kiểm tra disk space
echo "💾 Disk space:"
df -h / | tail -1
echo ""

echo "✅ Hoàn thành!"

