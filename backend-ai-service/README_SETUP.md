# Hướng dẫn chạy AI Service

## Yêu cầu

- Python 3.10 hoặc cao hơn
- PostgreSQL database (có hỗ trợ pgvector extension)
- API keys cho LLM providers (Naver CLOVA, OpenAI, v.v.)

## Bước 1: Cài đặt dependencies

```bash
cd backend-ai-service
pip install -r requirements.txt
```

Hoặc sử dụng virtual environment (khuyến nghị):

```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Trên macOS/Linux:
source venv/bin/activate
# Trên Windows:
# venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt
```

## Bước 2: Cấu hình môi trường

Tạo file `.env` trong thư mục `backend-ai-service`:

```env
# Database connection (PostgreSQL với pgvector)
NEONDB=postgresql://user:password@localhost:5432/database_name

# LLM Provider API Keys (chọn provider bạn muốn sử dụng)
# Naver CLOVA
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# OpenAI (nếu sử dụng)
OPENAI_API_KEY=your_openai_api_key

# Google Gemini (nếu sử dụng)
GOOGLE_API_KEY=your_google_api_key

# Cerebras (nếu sử dụng)
CEREBRAS_API_KEY=your_cerebras_api_key
```

**Lưu ý**: 
- Bạn cần có database PostgreSQL với extension `pgvector` đã được cài đặt
- Cấu hình LLM provider trong `config.yml` (mặc định là Naver)

## Bước 3: Chạy database migrations

```bash
cd database
python run_migrations.py
```

Hoặc chạy migrations thủ công:

```bash
# Kết nối đến database và chạy các file SQL trong thư mục migrations/
# Đảm bảo chạy theo thứ tự: 001, 002, 003, ...
```

## Bước 4: Kiểm tra kết nối database

```bash
python -c "from database.connection import test_connection; test_connection()"
```

## Bước 5: Chạy service

### Cách 1: Sử dụng uvicorn trực tiếp

```bash
cd backend-ai-service
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Cách 2: Chạy từ file main.py

```bash
cd backend-ai-service
python -m api.main
```

### Cách 3: Sử dụng Python module

```bash
cd backend-ai-service
python -m uvicorn api.main:app --reload --port 8000
```

## Bước 6: Kiểm tra service

Sau khi service chạy, bạn có thể:

1. **Kiểm tra health check:**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Xem API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

3. **Test root endpoint:**
   ```bash
   curl http://localhost:8000/
   ```

## Cấu hình nâng cao

### Thay đổi port

```bash
uvicorn api.main:app --reload --port 8001
```

### Chạy với logging chi tiết

```bash
uvicorn api.main:app --reload --log-level debug
```

### Chạy production mode (không reload)

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Troubleshooting

### Lỗi kết nối database

- Kiểm tra biến môi trường `NEONDB` đã được set chưa
- Kiểm tra database đang chạy và có thể kết nối được
- Kiểm tra pgvector extension đã được cài đặt: `CREATE EXTENSION IF NOT EXISTS vector;`

### Lỗi import modules

- Đảm bảo bạn đang ở đúng thư mục `backend-ai-service`
- Kiểm tra tất cả dependencies đã được cài đặt: `pip list`

### Lỗi LLM provider

- Kiểm tra API keys đã được cấu hình đúng trong `.env`
- Kiểm tra cấu hình provider trong `config.yml`
- Xem logs để biết chi tiết lỗi

### Lỗi port đã được sử dụng

```bash
# Tìm process đang sử dụng port 8000
lsof -i :8000

# Hoặc thay đổi port
uvicorn api.main:app --reload --port 8001
```

## Cấu trúc thư mục

```
backend-ai-service/
├── api/                    # FastAPI application
│   ├── main.py            # Entry point
│   └── routes/            # API routes
├── agents/                # AI agents và workflows
├── database/              # Database models và repositories
├── llm/                   # LLM providers
├── data_preprocessing/    # Document parsing và embedding
├── config.yml            # Cấu hình chính
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables (tạo file này)
```

## API Endpoints

Sau khi service chạy, các endpoints chính:

- `GET /` - Root endpoint
- `GET /api/v1/health` - Health check
- `GET /api/v1/ready` - Readiness check
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

Xem thêm trong Swagger UI tại http://localhost:8000/docs

## Next Steps

1. Tạo workspace đầu tiên
2. Upload documents
3. Query documents với RAG
4. Xem conversation history

Xem file `RAG_API_INTEGRATION.md` trong thư mục frontend để biết cách tích hợp với web app.

