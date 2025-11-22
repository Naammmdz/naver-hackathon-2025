# Hướng dẫn Cleanup Docker trên Dokploy

## Cách 1: Thêm vào Build Command (Khuyến nghị)

Trong Dokploy UI, vào **Application Settings** → **Build Command**, thay đổi từ:

```bash
docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

Thành:

```bash
docker builder prune -af && docker image prune -af && docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

Hoặc sử dụng wrapper script (nếu upload lên):

```bash
chmod +x docker-compose-wrapper.sh && ./docker-compose-wrapper.sh -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

## Cách 2: Sử dụng Cleanup Service

Chạy cleanup service trước khi build:

```bash
# Chạy cleanup
docker compose -p devflow-service-gokytk -f ./docker-compose.yml --profile tools run --rm cleanup

# Sau đó build bình thường
docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

## Cách 3: SSH vào VPS và chạy thủ công

1. SSH vào VPS của Dokploy
2. Chạy cleanup:

```bash
# Dọn build cache (giải phóng nhiều nhất)
docker builder prune -af

# Dọn images không dùng
docker image prune -af

# Kiểm tra dung lượng
docker system df
```

## Cách 4: Tạo Pre-Build Hook (Nếu Dokploy hỗ trợ)

Nếu Dokploy có pre-build hook, tạo file `.dokploy/pre-build.sh`:

```bash
#!/bin/bash
echo "🧹 Cleaning Docker before build..."
docker builder prune -af
docker image prune -af
echo "✅ Cleanup complete!"
```

## Cách 5: Cron Job (Tự động định kỳ)

SSH vào VPS và thêm cron job:

```bash
# Chạy cleanup mỗi ngày lúc 2h sáng
0 2 * * * docker builder prune -af && docker image prune -af >> /var/log/docker-cleanup.log 2>&1
```

## Kiểm tra dung lượng

```bash
# Kiểm tra Docker
docker system df

# Kiểm tra disk
df -h /
```

## Lưu ý

- **Build cache**: An toàn để xóa, sẽ tự tạo lại khi build
- **Images không dùng**: An toàn để xóa
- **Containers đang chạy**: Sẽ KHÔNG bị xóa
- **Volumes**: Cẩn thận khi dọn, có thể mất data

## Khuyến nghị cho Dokploy

**Cách tốt nhất**: Thêm cleanup vào Build Command:

```bash
docker builder prune -af && docker image prune -af && docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

Điều này sẽ tự động dọn trước mỗi lần build, giải phóng dung lượng và tránh lỗi "no space left on device".

