# Hybrid Collaborative Workspace System - Realtime Integration

Hệ thống collaborative realtime với Yjs + Hocuspocus đã được tích hợp thành công.

## Kiến trúc

```
Frontend (React + Yjs) 
    ↓ WebSocket
Hocuspocus Server (Node.js)
    ↓ JWT Auth
Backend Core (Spring Boot)
    ↓ Redis Pub/Sub
Metadata Sync
```

## Cấu trúc Services

### 1. Frontend (`/frontend`)
- **Yjs + @hocuspocus/provider**: Realtime document editing
- **Components**: 
  - `YjsDocumentEditor`: Editor với Yjs integration
  - `CursorLayer`: Hiển thị cursor của users khác
  - `useHocuspocusProvider`: Hook để kết nối với Hocuspocus

### 2. Backend Core (`/backend-core-service/be-core`)
- **Spring Boot 3.x**: CRUD APIs, authentication
- **Redis**: Pub/Sub cho metadata sync
- **PostgreSQL**: Database chính
- **APIs**:
  - `POST /api/internal/check-permission`: Check permission cho Hocuspocus

### 3. Hocuspocus Server (`/hocuspocus-server`)
- **Node.js**: WebSocket server cho Yjs
- **Extensions**:
  - DatabaseExtension: Persist Yjs documents
  - RedisExtension: Listen metadata updates và broadcast

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (cho local development)
- Java 21+ (cho backend)

### 1. Environment Variables

Tạo file `.env` ở root:

```env
# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_CLERK_JWT_TEMPLATE=your_jwt_template

# Backend Core
REDIS_HOST=localhost
REDIS_PORT=6379

# Hocuspocus
HOCUSPOCUS_URL=ws://localhost:1234
CORE_SERVICE_URL=http://localhost:8989
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/yjs
```

### 2. Chạy với Docker Compose

```bash
docker-compose up -d
```

Services sẽ chạy tại:
- Frontend: http://localhost:8080
- Backend Core: http://localhost:8989
- Hocuspocus: ws://localhost:1234
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 3. Local Development

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend Core
```bash
cd backend-core-service/be-core
./mvnw spring-boot:run
```

#### Hocuspocus Server
```bash
cd hocuspocus-server
npm install
npm run dev
```

## Data Sync Flows

### 1. Content Sync (Yjs)
- User A edits → Yjs generates update → Hocuspocus → Broadcast → User B receives

### 2. Presence Sync (Awareness)
- User A moves cursor → `awareness.setLocalStateField()` → Broadcast → Other users see cursor

### 3. Metadata Sync (Redis)
- User A renames document → `PUT /api/docs/{id}` → Backend publishes to Redis → Hocuspocus listens → Broadcast stateless → All clients update UI

## Sử dụng YjsDocumentEditor

Thay thế `DocumentEditor` bằng `YjsDocumentEditor` trong component:

```tsx
import { YjsDocumentEditor } from '@/components/documents/YjsDocumentEditor';

<YjsDocumentEditor
  document={document}
  isDark={isDark}
  canEditWorkspace={canEditWorkspace}
  onTaskClick={handleTaskClick}
  onChange={handleChange}
/>
```

## Redis Channel

Metadata updates được publish vào channel `metadata-channel`:

```json
{
  "docId": "doc-123",
  "action": "RENAME",
  "payload": "New Name"
}
```

## Authentication Flow

1. Frontend gửi JWT token khi connect HocuspocusProvider
2. Hocuspocus gọi `POST /api/internal/check-permission` với token
3. Backend verify token và check permissions
4. Nếu authorized → connection tiếp tục, else rejected

## Troubleshooting

### Frontend không connect được Hocuspocus
- Kiểm tra `VITE_HOCUSPOCUS_URL` trong `.env`
- Kiểm tra Hocuspocus server đang chạy

### Permission denied
- Kiểm tra JWT token có hợp lệ không
- Kiểm tra document có tồn tại và user có quyền không

### Redis không sync metadata
- Kiểm tra Redis đang chạy
- Kiểm tra channel name: `metadata-channel`
- Xem logs của Hocuspocus server

## Next Steps

1. **Full Yjs-BlockNote Integration**: Hiện tại chỉ sync metadata, cần tích hợp ProseMirror để sync content thực sự
2. **Task & Board Realtime**: Mở rộng Yjs cho tasks và boards
3. **Presence Improvements**: Cải thiện cursor tracking và user avatars
4. **Conflict Resolution**: Handle conflicts khi có nhiều users edit cùng lúc

