# RAG API 集成指南

本文档说明如何在前端应用中使用 AI 服务的 RAG API。

## 配置

### 环境变量

在 `.env` 文件中配置 AI 服务的基础 URL（可选）：

```env
VITE_AI_SERVICE_BASE_URL=http://localhost:8000
```

如果不设置，开发环境会使用 Vite 代理（`/ai-api`），生产环境会使用默认值 `http://localhost:8000`。

### Vite 代理配置

开发环境下，Vite 已经配置了代理，将 `/ai-api` 请求代理到 `http://localhost:8000`。这样可以避免 CORS 问题。

## 使用方式

### 方式 1: 使用 React Hooks（推荐）

```tsx
import { useWorkspaces, useDocuments, useRagQuery } from "@/hooks/useRagApi";

function MyComponent() {
  const { loading, error, createWorkspace } = useWorkspaces();
  const { uploadDocument } = useDocuments();
  const { query } = useRagQuery();

  const handleCreate = async () => {
    const workspace = await createWorkspace({
      name: "My Workspace",
      owner_id: "user123",
    });
    console.log(workspace);
  };

  return <button onClick={handleCreate}>Create Workspace</button>;
}
```

### 方式 2: 直接使用 API 客户端

```tsx
import { ragApi } from "@/lib/api/ragApi";

async function myFunction() {
  // 创建 workspace
  const workspace = await ragApi.createWorkspace({
    name: "My Workspace",
    owner_id: "user123",
  });

  // 上传文档
  const file = new File(["content"], "doc.pdf");
  const result = await ragApi.uploadDocument(
    workspace.workspace_id,
    file,
    "My Document"
  );

  // 查询文档
  const queryResult = await ragApi.queryDocuments(workspace.workspace_id, {
    query: "What is this about?",
    user_id: "user123",
  });

  console.log(queryResult.answer);
}
```

## 可用的 Hooks

### `useWorkspaces()`

管理工作区：

```tsx
const {
  loading,
  error,
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
} = useWorkspaces();
```

### `useDocuments()`

管理文档：

```tsx
const {
  loading,
  error,
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
} = useDocuments();
```

### `useRagQuery()`

查询文档（RAG）：

```tsx
const { loading, error, query } = useRagQuery();

const result = await query(workspaceId, {
  query: "Your question here",
  user_id: "user123",
  top_k: 5,
  include_memory: true,
});
```

### `useRagSessions()`

管理会话：

```tsx
const {
  loading,
  error,
  createSession,
  getHistory,
  deleteSession,
} = useRagSessions();
```

## API 端点

### Workspace 管理

- `POST /api/v1/workspaces` - 创建工作区
- `GET /api/v1/workspaces` - 列出工作区
- `GET /api/v1/workspaces/{id}` - 获取工作区
- `PATCH /api/v1/workspaces/{id}` - 更新工作区
- `DELETE /api/v1/workspaces/{id}` - 删除工作区

### 文档管理

- `POST /api/v1/workspaces/{id}/documents/upload` - 上传文档
- `GET /api/v1/workspaces/{id}/documents` - 列出文档
- `GET /api/v1/workspaces/{id}/documents/{doc_id}` - 获取文档
- `DELETE /api/v1/workspaces/{id}/documents/{doc_id}` - 删除文档
- `GET /api/v1/workspaces/{id}/documents/stats` - 获取文档统计

### 查询（RAG）

- `POST /api/v1/workspaces/{id}/query` - 查询文档

### 会话管理

- `POST /api/v1/sessions` - 创建会话
- `GET /api/v1/sessions/{id}/history` - 获取会话历史
- `DELETE /api/v1/sessions/{id}` - 删除会话

### 健康检查

- `GET /api/v1/health` - 健康检查
- `GET /api/v1/ready` - 就绪检查

## 完整示例

查看 `src/lib/api/ragApi.example.tsx` 文件获取更多使用示例。

## 类型定义

所有类型定义都在 `src/types/rag.ts` 文件中，包括：

- `WorkspaceResponse`
- `DocumentResponse`
- `QueryRequest` / `QueryResponse`
- `Citation`
- `SessionResponse`
- 等等

## 注意事项

1. **CORS**: 开发环境使用 Vite 代理，生产环境需要确保 AI 服务允许跨域请求，或使用反向代理。

2. **错误处理**: 所有 hooks 都返回 `error` 状态，记得处理错误情况。

3. **加载状态**: 所有 hooks 都返回 `loading` 状态，可以用来显示加载指示器。

4. **文件上传**: 支持的文件格式包括 PDF、DOCX、TXT、MD、HTML。

5. **会话管理**: 使用 `session_id` 来维护对话上下文，实现多轮对话。

## 启动服务

确保 AI 服务正在运行：

```bash
cd backend-ai-service
python -m uvicorn api.main:app --reload --port 8000
```

然后启动前端开发服务器：

```bash
cd frontend
npm run dev
```

前端会通过代理访问 AI 服务，无需担心 CORS 问题。

