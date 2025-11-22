# Docker Compose với Auto Cleanup

## Cách sử dụng

### 1. Sử dụng wrapper script (Khuyến nghị)

Thay vì dùng `docker compose` trực tiếp, dùng wrapper script:

```bash
# Build với auto cleanup
./docker-compose-wrapper.sh build

# Up với auto cleanup
./docker-compose-wrapper.sh up -d

# Up và build với auto cleanup
./docker-compose-wrapper.sh up -d --build

# Skip cleanup (nếu không muốn dọn)
./docker-compose-wrapper.sh build --no-cleanup
```

### 2. Tích hợp vào start-all.sh

Script `start-all.sh` đã được cập nhật để tự động sử dụng wrapper nếu có.

### 3. Chạy cleanup thủ công

```bash
# Chạy script cleanup
./cleanup-docker.sh

# Hoặc chạy trực tiếp
docker builder prune -af
docker image prune -af
```

## Cách hoạt động

Wrapper script sẽ:
1. **Tự động phát hiện** khi bạn chạy `build` hoặc `up`
2. **Dọn build cache** trước khi build (giải phóng nhiều dung lượng nhất)
3. **Dọn images không dùng** (an toàn)
4. **Hiển thị dung lượng** trước và sau khi dọn
5. **Tiếp tục** với docker compose command bình thường

## Lưu ý

- Cleanup chỉ chạy khi build/up, không chạy với các command khác (logs, ps, etc.)
- Build cache và images không dùng sẽ được dọn (an toàn)
- Containers và volumes đang dùng sẽ KHÔNG bị xóa
- Có thể skip cleanup bằng flag `--no-cleanup`

## Trên Dokploy VPS

1. Upload `docker-compose-wrapper.sh` lên VPS
2. Chạy: `chmod +x docker-compose-wrapper.sh`
3. Sử dụng wrapper thay vì `docker compose` trực tiếp

Hoặc thêm vào Dokploy build command:
```bash
./docker-compose-wrapper.sh build
```

