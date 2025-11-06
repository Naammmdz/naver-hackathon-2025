# Hocuspocus Server

WebSocket server cho Yjs collaborative editing sử dụng Hocuspocus.

## Setup

```bash
npm install
```

## Configuration

Copy `.env.example` thành `.env` và cập nhật các giá trị:

```env
PORT=1234
CORE_SERVICE_URL=http://localhost:8989
REDIS_HOST=localhost
REDIS_PORT=6379
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/yjs
```

## Development

```bash
npm run dev
```

## Build & Run

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t hocuspocus-server .
docker run -p 1234:1234 --env-file .env hocuspocus-server
```

## Architecture

- **onAuthenticate**: Verifies JWT token với backend-core
- **DatabaseExtension**: Persists Yjs documents trong PostgreSQL
- **RedisExtension**: Listens metadata updates từ Redis và broadcasts đến clients

