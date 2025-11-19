# Hướng dẫn dùng chung Database với Backend Core Service

## ⚠️ Lưu ý quan trọng

**KHÔNG chỉ đơn giản đổi địa chỉ database!** Có một số vấn đề cần xử lý:

---

## 🔍 Các vấn đề cần xử lý

### 1. **pgvector Extension** ⚠️ QUAN TRỌNG

**Vấn đề:**
- AI Service **BẮT BUỘC** cần pgvector extension cho vector search
- Core Service database có thể chưa có pgvector

**Giải pháp:**
```sql
-- Chạy migration này trên database của Core Service
CREATE EXTENSION IF NOT EXISTS vector;
```

**Kiểm tra:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

### 2. **Table Conflicts** ⚠️ QUAN TRỌNG

**Vấn đề:**
- Cả 2 services đều có table `workspaces` và `documents`
- Schema có thể khác nhau → **CONFLICT**

**So sánh schema:**

#### Backend Core Service `workspaces`:
- Có thể có: `id`, `name`, `description`, `owner_id`, `created_at`, `updated_at`
- Có thể có thêm: `is_public`, `allow_invites`, `members`, `invites`

#### Backend AI Service `workspaces`:
- Có: `id`, `name`, `description`, `owner_id`, `created_at`, `updated_at`
- Có thêm: `is_public`, `allow_invites`, `default_task_view`, `default_document_view`

**Giải pháp:**
- ✅ **Option A**: Merge schema - thêm các columns còn thiếu vào table hiện có
- ✅ **Option B**: Dùng table `workspaces` của Core Service, không tạo mới
- ✅ **Option C**: Đổi tên table trong AI Service (không khuyến nghị)

---

### 3. **Foreign Key Constraints** ⚠️

**Vấn đề:**
- AI Service có foreign keys:
  - `document_chunks.document_id → documents.id`
  - `document_chunks.workspace_id → workspaces.id`
  - `conversations.workspace_id → workspaces.id`
  - Và nhiều foreign keys khác...

**Nếu dùng chung database:**
- ✅ Foreign keys sẽ tự động hoạt động
- ✅ Workspace_id từ Core Service sẽ được reference
- ⚠️ Cần đảm bảo `documents` table có cùng schema

---

### 4. **Primary Key Format** ⚠️

**Vấn đề:**
- AI Service dùng `String` (UUID as string) cho primary keys
- Core Service có thể dùng `UUID` type hoặc `String`

**Kiểm tra:**
```sql
-- Xem schema của workspaces table
\d workspaces

-- Xem type của id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspaces' AND column_name = 'id';
```

**Giải pháp:**
- Đảm bảo `id` type tương thích (cả 2 dùng String hoặc cả 2 dùng UUID)

---

### 5. **Migrations** ⚠️

**Vấn đề:**
- Core Service có migrations riêng (JPA/Hibernate auto)
- AI Service có migrations riêng (SQL files)

**Giải pháp:**
- ✅ Chạy AI Service migrations trên database của Core Service
- ⚠️ Chỉ chạy các migrations tạo **MỚI** tables (document_chunks, conversations, etc.)
- ⚠️ **KHÔNG** chạy migrations tạo `workspaces` hoặc `documents` (đã có sẵn)

---

## 📋 Các bước thực hiện

### Bước 1: Kiểm tra database hiện tại

```sql
-- Kết nối đến database của Core Service
psql -h localhost -U postgres -d naver_hackathon

-- Kiểm tra pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Kiểm tra schema workspaces
\d workspaces

-- Kiểm tra schema documents
\d documents
```

### Bước 2: Cài đặt pgvector (nếu chưa có)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Bước 3: Kiểm tra schema compatibility

So sánh schema của `workspaces` và `documents` giữa 2 services:

**Core Service workspaces cần có:**
- `id` (String/UUID)
- `name` (String)
- `description` (String, nullable)
- `owner_id` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**AI Service cần thêm (nếu chưa có):**
- `is_public` (Boolean, nullable)
- `allow_invites` (Boolean, nullable)
- `default_task_view` (String, nullable)
- `default_document_view` (String, nullable)

### Bước 4: Chạy migrations của AI Service

**Chỉ chạy các migrations tạo tables MỚI:**

```bash
# Migration 003: Install pgvector (đã chạy ở bước 2)
# Migration 004: Create document_chunks
psql $DATABASE_URL < migrations/004_create_document_chunks.sql

# Migration 005: Create conversations
psql $DATABASE_URL < migrations/005_create_conversations.sql

# Migration 006: Create long_term_memory
psql $DATABASE_URL < migrations/006_create_long_term_memory.sql

# Migration 007: Create agent_actions
psql $DATABASE_URL < migrations/007_create_agent_actions.sql

# Migration 008: Create hitl_feedback
psql $DATABASE_URL < migrations/008_create_hitl_feedback.sql
```

**KHÔNG chạy:**
- ❌ Migration tạo `workspaces` (đã có sẵn)
- ❌ Migration tạo `documents` (đã có sẵn)
- ❌ Migration tạo `tasks` (đã có sẵn)

### Bước 5: Cập nhật .env của AI Service

```env
# Thay đổi từ NEONDB riêng sang database của Core Service
NEONDB=postgresql://postgres:12345@localhost:5432/naver_hackathon
```

**Hoặc nếu dùng Docker:**
```env
NEONDB=postgresql://postgres:postgres@postgres:5432/yjs
```

### Bước 6: Kiểm tra foreign keys

```sql
-- Kiểm tra foreign keys có hoạt động không
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

---

## ⚠️ Các vấn đề có thể gặp

### 1. Schema Mismatch

**Lỗi:** `column "is_public" does not exist`

**Giải pháp:**
```sql
-- Thêm columns còn thiếu vào workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN,
ADD COLUMN IF NOT EXISTS allow_invites BOOLEAN,
ADD COLUMN IF NOT EXISTS default_task_view VARCHAR,
ADD COLUMN IF NOT EXISTS default_document_view VARCHAR;
```

### 2. Foreign Key Violation

**Lỗi:** `foreign key constraint "fk_document_chunks_document" fails`

**Giải pháp:**
- Đảm bảo `documents` table có cùng schema
- Kiểm tra `documents.id` type phải match với `document_chunks.document_id`

### 3. pgvector không có

**Lỗi:** `extension "vector" does not exist`

**Giải pháp:**
```sql
-- Cài đặt pgvector
CREATE EXTENSION vector;

-- Hoặc nếu dùng Neon/cloud database, kiểm tra xem có hỗ trợ không
```

### 4. Primary Key Type Mismatch

**Lỗi:** `operator does not exist: uuid = character varying`

**Giải pháp:**
- Đảm bảo cả 2 services dùng cùng type cho `id` (String hoặc UUID)
- Nếu Core Service dùng UUID, cần convert trong AI Service:
  ```python
  # Trong AI Service models
  id = Column(UUID, primary_key=True, default=uuid.uuid4)
  ```

---

## ✅ Checklist trước khi chuyển

- [ ] Database của Core Service đã có pgvector extension
- [ ] Schema của `workspaces` table tương thích
- [ ] Schema của `documents` table tương thích
- [ ] Primary key type (`id`) tương thích
- [ ] Đã backup database trước khi chạy migrations
- [ ] Đã test migrations trên database test trước
- [ ] Đã cập nhật `.env` với connection string đúng
- [ ] Đã test kết nối từ AI Service đến database

---

## 🧪 Test sau khi chuyển

```bash
# 1. Test connection
cd backend-ai-service
python -c "from database.connection import test_connection; test_connection()"

# 2. Test query workspace
curl http://localhost:8000/api/v1/workspaces/{workspace_id_from_core}

# 3. Test query RAG
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "user_id": "user123"}'
```

---

## 📝 Tóm tắt

**KHÔNG chỉ đơn giản đổi địa chỉ!** Cần:

1. ✅ **Cài pgvector extension**
2. ✅ **Kiểm tra schema compatibility** (workspaces, documents)
3. ✅ **Chạy migrations** (chỉ các tables mới)
4. ✅ **Kiểm tra foreign keys**
5. ✅ **Test kỹ** trước khi deploy production

**Khuyến nghị:** Test trên database development/staging trước!

