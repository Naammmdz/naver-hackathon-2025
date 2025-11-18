# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repo implements a hybrid collaborative workspace system with:
- A React + Vite frontend (`frontend`)
- A Spring Boot core backend (`backend-core-service/be-core`)
- A Node.js Hocuspocus WebSocket server for Yjs (`hocuspocus-server`)
- A Python FastAPI-based AI service for RAG and LLM orchestration (`backend-ai-service`)

Realtime collaboration is built on Yjs documents synchronized via Hocuspocus, with metadata and workspace-level state synchronized through Redis and the core backend.

---

## Common Commands

### Full stack via Docker Compose

Prereqs: Docker + Docker Compose and environment variables in a root `.env` file (see `README_REALTIME.md` for details: Clerk keys, Redis, Hocuspocus, core service, Postgres URL).

```bash
docker-compose up -d        # Start Postgres, Redis, backend-core, Hocuspocus, frontend
docker-compose down         # Stop and remove containers
```

Services and default ports:
- Frontend: `http://localhost:8080`
- Backend Core: `http://localhost:8989`
- Hocuspocus: `ws://localhost:1234`
- Postgres: `localhost:5432` (Yjs docs)
- Redis: `localhost:6379`

### Frontend (React + Vite)

Working directory: `frontend`.

```bash
npm install                 # Install dependencies
npm run dev                 # Start Vite dev server on port 8080
npm run build               # Production build
npm run build -- --mode development   # Alternate dev build
npm run lint                # ESLint over the frontend codebase
```

Vite dev server proxies:
- `/api` → `http://localhost:8989` (core backend)
- `/ai-api` → `http://localhost:8000` (AI service), with `/ai-api` prefix stripped

### Backend Core (Spring Boot)

Working directory: `backend-core-service/be-core`.

```bash
./mvnw spring-boot:run      # Run API on port 8989 (use .\mvnw on Windows)
./mvnw test                 # Run all tests
./mvnw -Dtest=TaskServiceTest test                     # Run a single test class
./mvnw -Dtest=TaskServiceTest#shouldUpdateStatus test  # Run a single test method
./mvnw clean package        # Build JAR
```

Dockerized build (used by `docker-compose`):
- `Dockerfile` builds with `mvn clean package -DskipTests` and runs `java -jar app.jar` on port 8989.

### Hocuspocus Server (Yjs WebSocket)

Working directory: `hocuspocus-server`.

```bash
npm install                 # Install dependencies
npm run dev                 # TS dev server with hot reload
npm run build               # Compile TypeScript to dist/
npm start                   # Run compiled server (dist/index.js)
```

Configuration: copy `.env.example` → `.env` and set:
- `PORT=1234`
- `CORE_SERVICE_URL=http://localhost:8989`
- `REDIS_HOST`, `REDIS_PORT`
- `POSTGRES_URL` for Yjs document persistence

### AI Service (FastAPI + LangGraph)

Working directory: `backend-ai-service`.

#### Install & run

```bash
python -m venv venv         # Optional, recommended
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run DB migrations
cd database
python run_migrations.py
cd ..

# Start FastAPI with Uvicorn
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# or
python -m api.main
# or
python -m uvicorn api.main:app --reload --port 8000
```

Environment (`backend-ai-service/.env`):
- `NEONDB` Postgres connection string (with `pgvector` enabled)
- LLM provider keys: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `CEREBRAS_API_KEY`, etc.

Health and docs:

```bash
curl http://localhost:8000/api/v1/health   # Health check
curl http://localhost:8000/               # Root
# Swagger UI: http://localhost:8000/docs
# ReDoc:      http://localhost:8000/redoc
```

#### Python tests & demos

The AI service does not have a single top-level test runner documented, but key modules include demo/test entrypoints:

- Data preprocessing (chunking + embedding):

```bash
cd backend-ai-service
python data_preprocessing/demo_chunking_embedding.py
```

- Parsing module tests (using `pytest`):

```bash
cd backend-ai-service
python -m pytest data_preprocessing/parsing/tests/                       # All parsing tests
python -m pytest data_preprocessing/parsing/tests/test_docling_parser.py # Single test file
```

- LLM and token counter demos:

```bash
cd backend-ai-service/llm
python demo_llm_factory.py         # Exercise all providers (where keys available)
python test_naver_quick.py         # Quick HyperCLOVA test
python test.py                     # Original test harness
```

You can adapt the `pytest` patterns above to run additional Python tests as they are added.

---

## High-Level Architecture

### Realtime Collaboration (Documents, Tasks, Boards)

The realtime model is described in `README_REALTIME.md` and `README_REALTIME_WORKSPACE.md`.

**Core flow:**
- Frontend uses Yjs + `@hocuspocus/provider` for collaborative documents and workspace state.
- Hocuspocus server maintains Yjs docs over WebSocket, authenticating each connection via the core backend.
- Backend core exposes `POST /api/internal/check-permission` to validate JWT tokens and permissions per document/workspace.
- Redis is used as a Pub/Sub bus for stateless metadata events (renames, status changes, board updates), which Hocuspocus listens to and re-broadcasts to all connected clients.

**Document-level Yjs:**
- Each document has a separate Yjs instance (e.g. `document-{id}`) handled by `YjsDocumentEditor` on the frontend.
- Presence (cursors, awareness) is propagated via Yjs awareness states; UI components like `CursorLayer` render other users' cursors.

**Workspace-level Yjs:**
- Each workspace has a single Yjs document (`workspace-{id}`) combining tasks, task ordering, boards, and board canvas snapshots.
- Frontend hook `useWorkspaceYjs` connects to the workspace Yjs doc and exposes:
  - `tasksMap`: all tasks in a workspace
  - `taskOrdersMap`: per-column task ordering
  - `boardsMap`: board metadata
  - `boardContentMap`: board canvas content (e.g. Excalidraw snapshots)
- Hooks like `useTaskYjsSync` and `useBoardYjsSync` keep local state (Zustand stores) and Yjs docs in sync in both directions.
- Application wrapper components enable/disable the Yjs sync based on authentication (`isSignedIn`) and workspace selection.

### Frontend (Vite React app)

Key points for Warp when editing frontend code:
- The app resides under `frontend/src` with an alias `@` mapped to that path (see `vite.config.ts`). Use `@/...` imports rather than long relative paths.
- Realtime features are built around:
  - `YjsDocumentEditor` for documents
  - Workspace-level hooks (`useWorkspaceYjs`, `useTaskYjsSync`, `useBoardYjsSync`)
  - UI components for cursors and presence.
- API calls:
  - `/api/...` routes are proxied to the core backend.
  - `/ai-api/...` routes are proxied to the AI service (prefix removed), so the FastAPI app sees `/...` paths.
- Authentication uses Clerk (see `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_JWT_TEMPLATE` in root `.env`). JWTs are used when connecting to Hocuspocus and calling backend APIs.

When modifying frontend network logic, respect the Vite proxy configuration and ensure URL paths match the proxied backends.

### Backend Core Service (Spring Boot)

The core backend (`backend-core-service/be-core`) provides REST APIs for tasks, documents, and relations and also supports the realtime stack:

- **Tasks API:** `GET/POST/PUT/DELETE /api/tasks`, status transitions (`PATCH /api/tasks/{id}/status`), reordering, and subtasks.
- **Documents API:** CRUD with soft-delete/restore, tree hierarchy (`parentId`), trash listing, and search (`/api/documents/search`).
- **Task-Document relations:** `task_docs` endpoints handle links between tasks and documents with relation types.
- **Realtime auth:** an internal endpoint `POST /api/internal/check-permission` validates JWTs and access rights for Hocuspocus connections.

Persistence:
- Uses JPA entities for `tasks`, `subtasks`, `task_tags`, `documents`, `task_docs`, etc.
- Development defaults to an in-memory H2 DB; production uses Postgres with settings in `src/main/resources/application.properties`.

Redis integration:
- Spring Data Redis is used to publish metadata updates that Hocuspocus consumes and broadcasts to Yjs clients.

### Hocuspocus Server

The Hocuspocus Node.js server (`hocuspocus-server`) ties Yjs documents to the rest of the system:

- **onAuthenticate** handler: validates JWTs by calling the backend core `check-permission` endpoint.
- **DatabaseExtension:** persists Yjs documents in Postgres (configured via `POSTGRES_URL`), enabling durable collaborative documents.
- **RedisExtension:** subscribes to the `metadata-channel` and other channels for metadata changes (task updates, board renames, document renames) and forwards them as stateless updates to connected clients.

This service is the hub for all realtime updates; when adjusting schema or metadata flows, propagate changes through Redis message shapes and Hocuspocus listeners.

### AI Service (FastAPI, RAG, LLM Orchestration)

The AI service (`backend-ai-service`) is a separate FastAPI app providing retrieval-augmented generation and multi-provider LLM capabilities, with a focus on:

- Document ingestion and parsing
- Chunking and embedding
- Vector storage and RAG retrieval
- Multi-provider LLM abstraction with token tracking

Key internal modules (see their READMEs for detailed usage):

#### Data preprocessing pipeline (`data_preprocessing`)

- `parsing/`:
  - Implements `ParserFactory` with `DoclingParser` and `MarkdownParser`.
  - Accepts files, bytes, or raw markdown and returns a rich `ParsingResult` (text, metadata, paragraphs, headings, tables, images, etc.).
  - Supports OCR, table extraction, and Vietnamese text handling; all configurable via `config.yml` under `data_preprocessing.parsing`.

- `chunking/`:
  - Provides `ChunkerFactory` with strategies: `paragraph`, `fixed`, and placeholders for `semantic` and `hierarchical` methods.
  - Configuration via `data_preprocessing.chunking` in `config.yml` (method, chunk size, overlap).

- `embedding/`:
  - Provides `EmbeddingFactory` with providers such as HuggingFace models (e.g. `Qwen3-Embedding-0.6B`) and placeholders for Naver embeddings.
  - Integrates with `sentence-transformers` and `torch`, configurable via `data_preprocessing.embedding` in `config.yml`.

These modules are designed to be composed into a full RAG pipeline: parse → chunk → embed → store in DB/vector index.

#### Database layer and migrations (`database`)

Migrations (see `database/migrations/README_DB_MIGRATION.md`):
- SQL files `001_...`–`008_...` create and index tables for document chunks, conversations, long-term memory, agent actions, and HITL feedback.
- `run_migrations.py` applies migrations safely and verifies schema.

Important details:
- Postgres must have the `pgvector` extension installed (`003_install_pgvector.sql`).
- Vector indices are created using `ivfflat` and should be tuned (`lists` parameter) for large datasets.

When changing embeddings or RAG schema, ensure migrations and SQLAlchemy models stay aligned.

#### LLM abstraction and token tracking (`llm`)

- `LLMFactory` encapsulates providers: Naver HyperCLOVA X, OpenAI, Cerebras, and Google Gemini.
- Supports:
  - Plain text chatting via LangChain-compatible interfaces
  - Structured output using Pydantic schemas (`create_structured_llm`)
  - Provider configuration via `config.yml` under `llm.providers.*`.

Token counter (see `llm/README_TOKEN_COUNTER.md`):
- `TokenCounter`, `track_tokens` decorator, and `extract_token_usage` unify token accounting across providers.
- Works with both plain and structured responses (including `include_raw=True` structured outputs).
- Supports sessions (context manager) and JSON export for cost/performance analysis.

When adding new LLM providers or changing model configs, update `config.yml` and the provider-specific classes; for token tracking, extend `TokenExtractor` and register it in `TokenCounter.EXTRACTORS`.

---

## How Warp Should Approach Changes

- Use the existing service boundaries:
  - Frontend concerns (UI, routing, realtime UX) stay in `frontend`.
  - Core domain CRUD, authorization, and metadata flows belong in `backend-core-service/be-core`.
  - Realtime transport and document persistence live in `hocuspocus-server`.
  - AI/RAG features and LLM calls belong in `backend-ai-service`.
- Favor the existing factories and abstractions (`ParserFactory`, `ChunkerFactory`, `EmbeddingFactory`, `LLMFactory`, `TokenCounter`) instead of introducing parallel implementations.
- When touching realtime behavior, consider both Yjs document structure (document-level vs workspace-level) and Redis message shapes so that frontend hooks and backend publishers remain consistent.
