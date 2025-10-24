# Task-Document Linking System

Hệ thống kết nối giữa Tasks và Documents cho phép người dùng liên kết các tài liệu với các task một cách linh hoạt với nhiều loại mối quan hệ khác nhau.

## 🗄️ Database Schema

```sql
Table task_docs {
  id uuid [pk]
  task_id uuid [ref: > tasks.id]
  doc_id uuid [ref: > documents.id]
  relation_type varchar(20) [note: 'reference | reflection | resource']
  note text [optional]
  created_by varchar(10) [note: 'user | ai']
  created_at timestamp [default: now()]
}
```

## 🔗 Relation Types

### 1. **Reflection** (Ghi chú/Suy ngẫm)
- **Mô tả**: Document này là nơi viết ghi chú/suy ngẫm về task
- **Use case**: Khi đang viết document (BlockNote) và muốn link với task để ghi lại suy nghĩ, learning, notes
- **Context**: Document → Link Task (Doc là reflection về Task)
- **Ví dụ**: 
  - Viết doc "Spring Controller Best Practices" → Link với task "CRUD API Implementation"
  - Viết doc "Lessons Learned - Docker Setup" → Link với task "Deploy Docker Container"
- **Icon**: � FileText
- **Color**: Purple
- **Default for**: Document → Task linking

### 2. **Resource** (Tài liệu/Tài nguyên)
- **Mô tả**: Document này là tài liệu hướng dẫn/resource cho task
- **Use case**: Khi tạo/edit task và muốn attach tài liệu hướng dẫn, guide, tutorial
- **Context**: Task → Link Document (Doc là resource cho Task)
- **Ví dụ**: 
  - Task "Setup Spring Boot" → Link doc "Spring Boot Installation Guide"
  - Task "Implement Authentication" → Link doc "JWT Authentication Tutorial"
- **Icon**: � BookOpen
- **Color**: Green
- **Default for**: Task → Document linking

### 3. **Reference** (Tham chiếu)
- **Mô tả**: Liên kết tham chiếu chung hoặc auto-linking
- **Use case**: AI auto-detection, hoặc các liên kết không rõ ràng thuộc reflection hay resource
- **Context**: Có thể từ cả hai phía, hoặc do AI tạo
- **Ví dụ**: 
  - AI phát hiện doc "API Design Patterns" có liên quan đến task "Design REST API"
  - User muốn tạo link tham chiếu chung không phân loại cụ thể
- **Icon**: � Link
- **Color**: Blue
- **Default for**: AI suggestions hoặc general references

## 📋 Use Cases

### Use Case 1: Document Reflection về Task
**Context**: Đang viết document trong BlockNote, muốn link với task liên quan

```typescript
// Scenario: User đang viết doc "Spring Controller Notes" 
//           → Click "Link Task" → Chọn task "CRUD API"
//           → Relation type tự động là "reflection"

{
  taskId: "task-crud-api",
  docId: "doc-spring-controller-notes",
  relationType: "reflection", // Doc là reflection về task
  createdBy: "user",
  note: "Ghi chú về cách implement Spring Controller trong CRUD API"
}
```

**UI Flow**:
1. Đang ở Document Editor (BlockNote)
2. Scroll xuống phần "Related Tasks"
3. Click "Link Task" → Dialog mở ra
4. Chọn task → Relation type default là "reflection"
5. Thêm note (optional) → Save
6. Document này giờ là reflection/note về task đã chọn

### Use Case 2: Task Resource Document
**Context**: Đang tạo/edit task, muốn attach tài liệu hướng dẫn

```typescript
// Scenario: User đang xem task "Docker Setup"
//           → Click "Link Document" → Chọn doc "Docker Installation Guide"
//           → Relation type tự động là "resource"

{
  taskId: "task-docker-setup",
  docId: "doc-docker-guide",
  relationType: "resource", // Doc là resource cho task
  createdBy: "user",
  note: "Official Docker installation and setup guide"
}
```

**UI Flow**:
1. Đang ở Task Details Drawer
2. Scroll xuống phần "Linked Documents"
3. Click "Link Document" → Dialog mở ra
4. Chọn document → Relation type default là "resource"
5. Thêm note (optional) → Save
6. Document này giờ là resource/tài liệu cho task

### Use Case 3: AI Auto-Linking (Reference)
**Context**: AI phát hiện liên quan và tự động suggest

```typescript
// Scenario: AI scan nội dung và phát hiện liên quan
//           → Auto-create link với type "reference"

{
  taskId: "task-spring-security",
  docId: "doc-spring-best-practices",
  relationType: "reference", // AI detected reference
  createdBy: "ai",
  note: "AI detected: Document mentions Spring Security configuration patterns"
}
```

**AI Flow**:
1. AI analyze document content
2. Detect keywords/topics matching task
3. Auto-suggest or create link with type "reference"
4. User có thể accept, reject, hoặc change type thành reflection/resource

## 🎨 UI Components

### 1. TaskDocLinker (Task → Document)
Hiển thị và quản lý documents liên kết với task

**Location**: Task Details Drawer
**Default Relation Type**: `resource` (tài liệu cho task)
**Features**:
- View all linked documents
- Add new document links (default: resource)
- Change relation type between resource/reflection/reference
- Remove links
- Add notes for each relation
**Use Case**: Khi cần attach tài liệu hướng dẫn, tutorial, guide cho task

### 2. DocTaskLinker (Document → Task)
Hiển thị và quản lý tasks liên kết với document

**Location**: Document Editor Page (below BlockNote editor)
**Default Relation Type**: `reflection` (doc là ghi chú về task)
**Features**:
- View all linked tasks
- Add new task links (default: reflection)
- Change relation type
- Remove links
- See task status and priority
**Use Case**: Khi đang viết document và muốn ghi lại đây là reflection/note về task nào

## 🔧 API Usage

### Add Task-Doc Link
```typescript
import { useTaskDocStore } from '@/store/taskDocStore';

const { addTaskDoc } = useTaskDocStore();

addTaskDoc({
  taskId: "task-123",
  docId: "doc-456",
  relationType: "reference",
  note: "Optional note",
  createdBy: "user"
});
```

### Get Links for Task
```typescript
const { getTaskDocsByTask, getDocsLinkedToTask } = useTaskDocStore();

// Get full task-doc objects
const taskDocs = getTaskDocsByTask("task-123");

// Get just doc IDs
const docIds = getDocsLinkedToTask("task-123");
```

### Get Links for Document
```typescript
const { getTaskDocsByDoc, getTasksLinkedToDoc } = useTaskDocStore();

// Get full task-doc objects
const taskDocs = getTaskDocsByDoc("doc-456");

// Get just task IDs
const taskIds = getTasksLinkedToDoc("doc-456");
```

### Filter by Relation Type
```typescript
const { getTaskDocsByRelationType } = useTaskDocStore();

// Get only reflections for a task
const reflections = getTaskDocsByRelationType("task-123", "reflection");
```

### Bulk Operations
```typescript
const { linkMultipleDocsToTask } = useTaskDocStore();

// Link multiple documents at once (useful for AI suggestions)
linkMultipleDocsToTask(
  "task-123",
  ["doc-1", "doc-2", "doc-3"],
  "reference",
  "ai"
);
```

## 🤖 AI Integration Ideas

### 1. Smart Suggestions
AI có thể tự động gợi ý documents liên quan khi:
- User tạo task mới
- User đang viết document và mention task
- Phát hiện keyword overlap giữa task và document

### 2. Auto-Categorization
AI có thể tự động phân loại relation type dựa trên:
- Nội dung task và document
- Context của việc linking
- User behavior patterns

### 3. Related Content Discovery
AI có thể tìm và suggest:
- Documents tương tự với tasks đang làm
- Tasks liên quan khi đang viết document
- Knowledge graph visualization

## 📊 Data Flow Example

```
User Action → Component → Store → LocalStorage
     ↓
[Link Doc to Task]
     ↓
TaskDocLinker Component
     ↓
useTaskDocStore.addTaskDoc()
     ↓
taskDocs array updated
     ↓
Persisted to localStorage
     ↓
UI updates automatically (Zustand)
```

## 🎯 Benefits

1. **Clear Context Separation**: 
   - **Reflection**: Document là ghi chú VỀ task (document-centric)
   - **Resource**: Document là tài liệu CHO task (task-centric)
   
2. **Intuitive Defaults**: 
   - Viết doc → link task = reflection (tự nhiên là "tôi đang viết về task này")
   - Làm task → link doc = resource (tự nhiên là "tôi cần doc này cho task")
   
3. **Knowledge Management**: 
   - Reflection docs: Capture learnings, insights, post-mortems
   - Resource docs: Organize tutorials, guides, references
   
4. **Bidirectional Discovery**:
   - Từ task: Tìm tài liệu cần thiết (resources) và ghi chú liên quan (reflections)
   - Từ doc: Xem doc này là reflection của tasks nào
   
5. **AI Enhancement Ready**: 
   - AI có thể suggest resources khi tạo task
   - AI có thể tạo reflection docs automatically
   - Reference type cho AI auto-linking

## 🚀 Future Enhancements

- [ ] Bi-directional sync notifications
- [ ] Task-Doc relationship visualization (graph view)
- [ ] Bulk linking operations from UI
- [ ] AI-powered auto-linking
- [ ] Export task-doc relationships
- [ ] Search across linked content
- [ ] Relationship strength scoring
- [ ] Duplicate relationship detection
- [ ] Archived relationships (soft delete)
- [ ] Relationship history/audit log
