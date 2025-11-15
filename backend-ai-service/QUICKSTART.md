# Quick Start - Chạy AI Service

## Cách nhanh nhất để chạy service

### Bước 1: Cài đặt dependencies

```bash
cd backend-ai-service
pip install -r requirements.txt
```

Hoặc sử dụng virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Bước 2: Cấu hình môi trường

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Sau đó chỉnh sửa file `.env` với thông tin của bạn:

```env
NEONDB=postgresql://user:password@localhost:5432/database_name
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

### Bước 3: Chạy database migrations (nếu cần)

```bash
cd database
python run_migrations.py
```

### Bước 4: Chạy service

**Cách 1: Sử dụng script (khuyến nghị)**

```bash
./run.sh
```

**Cách 2: Chạy trực tiếp**

```bash
uvicorn api.main:app --reload --port 8000
```

**Cách 3: Sử dụng Python module**

```bash
python -m uvicorn api.main:app --reload --port 8000
```

### Bước 5: Kiểm tra service

Mở trình duyệt và truy cập:

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health
- **Root**: http://localhost:8000/

## Troubleshooting nhanh

### Lỗi: "NEONDB environment variable not set"

➡️ Tạo file `.env` và thêm biến `NEONDB`

### Lỗi: "Database connection failed"

➡️ Kiểm tra:
- Database đang chạy
- Connection string trong `.env` đúng
- pgvector extension đã được cài đặt

### Lỗi: "Module not found"

➡️ Cài đặt lại dependencies:
```bash
pip install -r requirements.txt
```

### Lỗi: "Port already in use"

➡️ Sử dụng port khác:
```bash
uvicorn api.main:app --reload --port 8001
```

## Các lệnh hữu ích

```bash
# Kiểm tra database connection
python -c "from database.connection import test_connection; test_connection()"

# Xem tất cả dependencies
pip list

# Chạy với logging chi tiết
uvicorn api.main:app --reload --log-level debug

# Chạy production mode
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Next Steps

Sau khi service chạy thành công:

1. ✅ Kiểm tra health: http://localhost:8000/api/v1/health
2. ✅ Xem API docs: http://localhost:8000/docs
3. ✅ Tạo workspace đầu tiên
4. ✅ Upload documents
5. ✅ Query documents với RAG

Xem `README_SETUP.md` để biết hướng dẫn chi tiết hơn.

