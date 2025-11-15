# Danh sách API Endpoints

Tất cả các API endpoints của AI Service được nhóm theo chức năng.

**Base URL**: `http://localhost:8000/api/v1`

---

## 🏥 Health Check APIs

### 1. Health Check
- **Method**: `GET`
- **Endpoint**: `/health`
- **Mô tả**: Kiểm tra trạng thái hệ thống và các dependencies
- **Response**: 
  ```json
  {
    "status": "healthy" | "degraded",
    "database": "healthy" | "unhealthy",
    "llm_providers": {
      "naver": true/false,
      "openai": true/false,
      "cerebras": true/false,
      "gemini": true/false
    },
    "version": "1.0.0"
  }
  ```

### 2. Readiness Check
- **Method**: `GET`
- **Endpoint**: `/ready`
- **Mô tả**: Kiểm tra xem hệ thống đã sẵn sàng phục vụ requests chưa
- **Response**:
  ```json
  {
    "ready": true/false,
    "checks": {
      "database": true/false,
      "llm": true/false
    }
  }
  ```

### 3. Liveness Check
- **Method**: `GET`
- **Endpoint**: `/liveness`
- **Mô tả**: Kiểm tra đơn giản xem service còn sống không
- **Response**:
  ```json
  {
    "status": "alive"
  }
  ```

---

## 📁 Workspace Management APIs

### 1. Tạo Workspace
- **Method**: `POST`
- **Endpoint**: `/workspaces`
- **Mô tả**: Tạo workspace mới
- **Request Body**:
  ```json
  {
    "name": "Tên workspace",
    "description": "Mô tả (optional)",
    "owner_id": "user_id"
  }
  ```
- **Response**: `WorkspaceResponse` (201 Created)

### 2. Lấy Workspace
- **Method**: `GET`
- **Endpoint**: `/workspaces/{workspace_id}`
- **Mô tả**: Lấy thông tin workspace theo ID
- **Response**: `WorkspaceResponse`

### 3. Liệt kê Workspaces
- **Method**: `GET`
- **Endpoint**: `/workspaces?owner_id={owner_id}&skip={skip}&limit={limit}`
- **Mô tả**: Liệt kê tất cả workspaces (có thể filter theo owner)
- **Query Parameters**:
  - `owner_id` (optional): Lọc theo owner
  - `skip` (optional, default: 0): Số records bỏ qua
  - `limit` (optional, default: 100): Số records tối đa
- **Response**: `List[WorkspaceResponse]`

### 4. Cập nhật Workspace
- **Method**: `PATCH`
- **Endpoint**: `/workspaces/{workspace_id}`
- **Mô tả**: Cập nhật thông tin workspace
- **Request Body**:
  ```json
  {
    "name": "Tên mới (optional)",
    "description": "Mô tả mới (optional)"
  }
  ```
- **Response**: `WorkspaceResponse`

### 5. Xóa Workspace
- **Method**: `DELETE`
- **Endpoint**: `/workspaces/{workspace_id}`
- **Mô tả**: Xóa workspace và tất cả documents trong đó
- **Response**: 204 No Content

---

## 📄 Document Management APIs

### 1. Upload và Ingest Document
- **Method**: `POST`
- **Endpoint**: `/workspaces/{workspace_id}/documents/upload`
- **Mô tả**: Upload file và tự động ingest vào workspace
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: File document (PDF, DOCX, TXT, MD, HTML)
  - `title` (optional): Tiêu đề tùy chỉnh
- **Response**: `IngestResponse` (201 Created)
  ```json
  {
    "document_id": "doc_123",
    "title": "Tên document",
    "chunks_created": 10,
    "status": "success",
    "message": "Successfully ingested 10 chunks"
  }
  ```

### 2. Liệt kê Documents
- **Method**: `GET`
- **Endpoint**: `/workspaces/{workspace_id}/documents?page={page}&page_size={page_size}`
- **Mô tả**: Liệt kê tất cả documents trong workspace
- **Query Parameters**:
  - `page` (optional, default: 1): Số trang
  - `page_size` (optional, default: 50): Số items mỗi trang
- **Response**: `DocumentListResponse`
  ```json
  {
    "documents": [...],
    "total": 100,
    "page": 1,
    "page_size": 50
  }
  ```

### 3. Lấy Document
- **Method**: `GET`
- **Endpoint**: `/workspaces/{workspace_id}/documents/{document_id}`
- **Mô tả**: Lấy thông tin document theo ID
- **Response**: `DocumentResponse`

### 4. Xóa Document
- **Method**: `DELETE`
- **Endpoint**: `/workspaces/{workspace_id}/documents/{document_id}`
- **Mô tả**: Xóa document và tất cả chunks của nó
- **Response**: 204 No Content

### 5. Lấy Document Statistics
- **Method**: `GET`
- **Endpoint**: `/workspaces/{workspace_id}/documents/stats`
- **Mô tả**: Lấy thống kê về documents trong workspace
- **Response**: `DocumentStats`
  ```json
  {
    "total_documents": 10,
    "total_chunks": 150,
    "total_size_bytes": 1024000,
    "documents_by_type": {
      "pdf": 5,
      "docx": 3,
      "txt": 2
    }
  }
  ```

---

## 💬 Query/RAG APIs

### 1. Query Documents (RAG)
- **Method**: `POST`
- **Endpoint**: `/workspaces/{workspace_id}/query`
- **Mô tả**: Đặt câu hỏi và nhận câu trả lời dựa trên documents trong workspace
- **Request Body**:
  ```json
  {
    "query": "Câu hỏi của bạn",
    "user_id": "user123",
    "session_id": "session_123 (optional)",
    "llm_provider": "naver (optional)",
    "top_k": 5,
    "include_memory": true
  }
  ```
- **Response**: `QueryResponse`
  ```json
  {
    "query": "Câu hỏi",
    "answer": "Câu trả lời",
    "citations": [
      {
        "chunk_id": "chunk_123",
        "document_id": "doc_123",
        "document_name": "Tên document",
        "page_number": 1,
        "chunk_text": "Text của chunk",
        "score": 0.95
      }
    ],
    "confidence": 0.9,
    "session_id": "session_123",
    "retrieval_stats": {...},
    "metadata": {...}
  }
  ```

---

## 🗣️ Session Management APIs

### 1. Tạo Session
- **Method**: `POST`
- **Endpoint**: `/sessions`
- **Mô tả**: Tạo conversation session mới
- **Request Body**:
  ```json
  {
    "user_id": "user123",
    "session_name": "Tên session (optional)"
  }
  ```
- **Response**: `SessionResponse` (201 Created)
  ```json
  {
    "session_id": "session_123",
    "user_id": "user123",
    "created_at": "2024-01-01T00:00:00"
  }
  ```

### 2. Lấy Conversation History
- **Method**: `GET`
- **Endpoint**: `/sessions/{session_id}/history?limit={limit}`
- **Mô tả**: Lấy lịch sử conversation của session
- **Query Parameters**:
  - `limit` (optional, default: 50): Số messages tối đa
- **Response**: `ConversationHistory`
  ```json
  {
    "session_id": "session_123",
    "messages": [
      {
        "role": "user",
        "content": "Câu hỏi",
        "timestamp": "2024-01-01T00:00:00",
        "confidence": null
      },
      {
        "role": "assistant",
        "content": "Câu trả lời",
        "timestamp": "2024-01-01T00:00:01",
        "confidence": 0.9
      }
    ],
    "total_messages": 2
  }
  ```

### 3. Xóa Session
- **Method**: `DELETE`
- **Endpoint**: `/sessions/{session_id}`
- **Mô tả**: Xóa session và tất cả messages trong đó
- **Response**: 204 No Content

---

## 📚 Root Endpoint

### Root
- **Method**: `GET`
- **Endpoint**: `/`
- **Mô tả**: Thông tin cơ bản về API
- **Response**:
  ```json
  {
    "name": "Document RAG API",
    "version": "1.0.0",
    "status": "running",
    "docs": "/docs"
  }
  ```

---

## 📖 API Documentation

Truy cập Swagger UI để xem tài liệu chi tiết và test các endpoints:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🔐 Authentication

Hiện tại API không yêu cầu authentication. Trong production, bạn nên thêm authentication middleware.

---

## 📝 Notes

1. Tất cả endpoints trả về JSON
2. Error responses có format:
   ```json
   {
     "detail": "Error message"
   }
   ```
3. Status codes:
   - `200`: Success
   - `201`: Created
   - `204`: No Content (successful deletion)
   - `404`: Not Found
   - `500`: Internal Server Error

