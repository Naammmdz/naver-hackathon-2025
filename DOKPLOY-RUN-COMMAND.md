# Dokploy Run Command - Hướng dẫn

## Command an toàn (Khuyến nghị)

Sử dụng command này trong Dokploy "Run Command" (tab Advanced):

```bash
(docker builder prune -af 2>/dev/null || true) && (docker image prune -af 2>/dev/null || true) && docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

## Giải thích

- `2>/dev/null`: Ẩn error messages (không làm fail build)
- `|| true`: Đảm bảo cleanup không làm fail build nếu có lỗi
- `&&`: Chỉ chạy build nếu cleanup thành công (hoặc skip được)

## Command đơn giản hơn (nếu vẫn lỗi)

Nếu command trên vẫn lỗi, thử command đơn giản hơn:

```bash
docker builder prune -af; docker image prune -af; docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans
```

Dùng `;` thay vì `&&` để các lệnh chạy độc lập.

## Nếu vẫn lỗi ở cloning

Nếu deployment dừng ở bước cloning (trước khi chạy command), có thể là:
1. Git permissions issue
2. Disk space issue (cần dọn thủ công qua SSH)
3. Network issue

Trong trường hợp này, cần SSH vào VPS và dọn thủ công trước.

