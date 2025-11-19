# So sánh Database: Backend AI Service vs Backend Core Service

## 📊 Tổng quan

**Backend AI Service** và **Backend Core Service** đang sử dụng **2 DATABASE KHÁC NHAU**.

---

## 🔍 Backend AI Service

### Database Connection:
- **Biến môi trường**: `NEONDB`
- **Format**: `postgresql://user:password@host:port/database_name`
- **Ví dụ**: `postgresql://user:password@localhost:5432/database_name`
- **File config**: `.env` trong `backend-ai-service/`

### Database Requirements:
- ✅ PostgreSQL với **pgvector extension**
- ✅ Cần vector support cho embeddings (1024 dimensions)
- ✅ Database riêng biệt cho RAG features

### Tables trong AI Service Database:
- `workspaces` - Workspace cho RAG
- `documents` - Document metadata
- `document_chunks` - Chunks với vector embeddings
- `conversations` - Chat history
- `long_term_memory` - Learned knowledge
- `agent_actions` - Action logs
- `hitl_feedback` - Human feedback

---

## 🔍 Backend Core Service

### Database Connection:
- **Config file**: `application.properties`
- **Spring config**: `spring.datasource.url`
- **Local**: `jdbc:postgresql://localhost:5432/naver_hackathon`
- **Docker**: `jdbc:postgresql://postgres:5432/yjs`
- **Port**: 5432

### Database Requirements:
- ✅ PostgreSQL (không cần pgvector)
- ✅ Database cho core features (workspaces, tasks, documents, boards)

### Tables trong Core Service Database:
- `workspaces` - Workspace cho core app
- `documents` - Documents trong app
- `tasks` - Tasks
- `boards` - Boards/Canvas
- `workspace_members` - Members
- `workspace_invites` - Invites
- Và các tables khác...

---

## ⚠️ Vấn đề: Workspace ID Sync

### Hiện tại:
- **Backend Core** có `workspaces` table riêng
- **Backend AI Service** cũng có `workspaces` table riêng
- **2 database khác nhau** → **workspace_id không sync**

### Khi query RAG:
```python
# API: POST /api/v1/workspaces/{workspace_id}/query
# Backend AI Service kiểm tra workspace_id trong database của nó
workspace = workspace_repo.get_by_id(workspace_id)
```

### Vấn đề:
1. ❌ Workspace tạo trong Core Service không tự động có trong AI Service
2. ❌ Workspace_id từ Core Service có thể không tồn tại trong AI Service
3. ❌ Cần sync workspace giữa 2 services

---

## 💡 Giải pháp

### Option 1: Dùng chung database (Recommended)
- Cấu hình AI Service dùng cùng database với Core Service
- Thêm pgvector extension vào database của Core Service
- Workspace_id sẽ tự động sync

### Option 2: Sync workspace (Hiện tại)
- Khi tạo workspace trong Core Service → tạo workspace tương ứng trong AI Service
- Hoặc query workspace từ Core Service API trước khi query RAG

### Option 3: Separate databases (Hiện tại)
- Giữ 2 database riêng biệt
- Implement sync mechanism giữa 2 services
- Workspace creation trong Core → trigger creation trong AI Service

---

## 🔧 Cấu hình hiện tại

### Backend AI Service `.env`:
```env
NEONDB=postgresql://user:password@localhost:5432/database_name
```

### Backend Core Service `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/naver_hackathon
```

### Docker Compose:
```yaml
# Core Service database
postgres:
  POSTGRES_DB: yjs
  ports: "5432:5432"

# AI Service database (không có trong docker-compose)
# Cần cấu hình riêng qua NEONDB
```

---

## 📝 Kết luận

**Đúng, chúng là 2 database KHÁC NHAU:**

1. ✅ **Backend Core Service**: Database `naver_hackathon` hoặc `yjs` (port 5432)
2. ✅ **Backend AI Service**: Database từ biến `NEONDB` (có thể là Neon hoặc PostgreSQL khác)

**Lưu ý quan trọng:**
- Workspace_id cần được sync giữa 2 services
- Khi query RAG, workspace_id phải tồn tại trong AI Service database
- Có thể cần implement workspace sync mechanism

