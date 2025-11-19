# Plan Chi Tiết: Implement BlockNote Comments Từ Đầu

## Bước 1: Xóa Tất Cả Code Comment Hiện Tại

### Frontend:
- [ ] Xóa `frontend/src/lib/blocknote/threadStore.ts`
- [ ] Xóa `frontend/src/lib/blocknote/resolveUsers.ts`
- [ ] Xóa tất cả code comment trong `frontend/src/components/documents/DocumentEditor.tsx`:
  - Xóa imports: `ThreadsSidebar`, `FloatingThreadController`, `FloatingComposerController`
  - Xóa `FloatingComposerControllerWrapper` component
  - Xóa `isCommentsSidebarOpen` state
  - Xóa `threadStore` và `resolveUsers` logic
  - Xóa `comments={true}` prop
  - Xóa ThreadsSidebar UI
  - Xóa comment button
- [ ] Xóa CSS comment styles trong `frontend/src/index.css`

### Backend:
- [ ] Xóa `backend-core-service/be-core/src/main/java/com/naammm/becore/controller/BlockNoteThreadStoreController.java`
- [ ] Xóa `backend-core-service/be-core/src/main/java/com/naammm/becore/service/BlockNoteThreadStoreService.java`
- [ ] Xóa `backend-core-service/be-core/src/main/java/com/naammm/becore/dto/BlockNoteThreadDto.java`
- [ ] Xóa `backend-core-service/be-core/src/main/java/com/naammm/becore/dto/BlockNoteCommentDto.java`
- [ ] Xóa `backend-core-service/be-core/src/main/java/com/naammm/becore/dto/BlockNoteCreateThreadRequest.java`
- [ ] Giữ lại entity và repository (có thể dùng lại):
  - `DocumentComment.java`
  - `DocumentCommentRepository.java`
  - `DocumentCommentService.java` (có thể cần refactor)

## Bước 2: Hiểu BlockNote Comments Architecture

Theo doc BlockNote:
1. **ThreadStore**: Interface để lưu trữ và retrieve comment threads
   - `RESTYjsThreadStore`: Kết hợp Yjs storage với REST API backend
   - Yjs map lưu thread data, REST API xử lý writes với access control
   - Reads từ Yjs document trực tiếp (sau khi được update bởi REST API)

2. **resolveUsers**: Function để lấy user info (name, avatar) từ userIds

3. **ThreadStoreAuth**: Authorization rules cho comments
   - `DefaultThreadStoreAuth`: Basic implementation với userId và role

4. **Comments UI**:
   - `FloatingComposerController`: Hiển thị composer khi tạo comment mới
   - `FloatingThreadController`: Hiển thị thread khi click vào highlighted text
   - `ThreadsSidebar`: Sidebar để xem tất cả comments

5. **Highlight & Click**:
   - BlockNote tự động tạo marks trong document khi thread được tạo
   - Marks có class `.bn-thread-mark` và attribute `data-bn-thread-id`
   - Click vào mark sẽ trigger `FloatingThreadController` hiển thị thread

## Bước 3: Implement Backend API (Theo BlockNote RESTYjsThreadStore Spec)

### API Endpoints Cần Implement:
1. `GET /api/blocknote/threads?documentId={documentId}` - Get all threads
2. `GET /api/blocknote/threads/{threadId}` - Get single thread
3. `POST /api/blocknote/threads` - Create new thread
4. `PUT /api/blocknote/threads/{threadId}` - Update thread
5. `DELETE /api/blocknote/threads/{threadId}` - Delete thread
6. `POST /api/blocknote/threads/{threadId}/addToDocument` - Add thread to document (create mark)
7. `POST /api/blocknote/threads/{threadId}/comments` - Add comment to thread
8. `PUT /api/blocknote/threads/{threadId}/comments/{commentId}` - Update comment
9. `DELETE /api/blocknote/threads/{threadId}/comments/{commentId}` - Delete comment
10. `POST /api/blocknote/threads/{threadId}/resolve` - Resolve thread
11. `POST /api/blocknote/threads/{threadId}/unresolve` - Unresolve thread
12. `POST /api/blocknote/threads/{threadId}/comments/{commentId}/reactions` - Add reaction
13. `DELETE /api/blocknote/threads/{threadId}/comments/{commentId}/reactions/{emoji}` - Delete reaction

### Data Format:
- Thread: `{ id, createdAt, updatedAt, comments: [], resolved, resolvedBy, resolvedAt, metadata }`
- Comment: `{ id, userId, createdAt, updatedAt, body: BlockNote blocks[], reactions: [], metadata }`
- Body là BlockNote document (array of blocks), không có `id` fields

## Bước 4: Implement Frontend ThreadStore

### File: `frontend/src/lib/blocknote/threadStore.ts`
- Tạo `RESTYjsThreadStore` instance
- Base URL: `/api/blocknote/threads`
- Headers: Authorization từ `apiAuthContext`
- Yjs map: `ydoc.getMap('threads-{documentId}')`
- Implement `addThreadToDocument` để inject `documentId` vào request

### File: `frontend/src/lib/blocknote/resolveUsers.ts`
- Function nhận `userIds: string[]` và return `Promise<User[]>`
- Lấy user info từ `useWorkspaceStore.getState().members`
- Return format: `{ id, username, avatarUrl }`

## Bước 5: Tích Hợp Vào DocumentEditor

### Trong `DocumentEditor.tsx`:
1. Tạo `threadStore` với `RESTYjsThreadStore`:
   ```typescript
   const threadStore = useMemo(() => {
     if (!ydoc || !document?.id || !userId) return null;
     const threadsMap = ydoc.getMap(`threads-${document.id}`);
     return new RESTYjsThreadStore(
       '/api/blocknote/threads',
       getHeaders(),
       threadsMap,
       new DefaultThreadStoreAuth(userId, 'comment')
     );
   }, [ydoc, document?.id, userId]);
   ```

2. Tạo `resolveUsers` function:
   ```typescript
   const resolveUsers = useMemo(() => createResolveUsers(), []);
   ```

3. Thêm vào editor config:
   ```typescript
   config.comments = {
     threadStore,
     resolveUsers,
   };
   ```

4. Enable comments trong `BlockNoteView`:
   ```typescript
   <BlockNoteView comments={true} ... />
   ```

5. BlockNote tự động render `FloatingComposerController` và `FloatingThreadController` khi `comments={true}`

## Bước 6: CSS Styling

### File: `frontend/src/index.css`
- Thêm styles cho `.bn-thread-mark` để highlight text có comment
- Thêm styles cho `.bn-thread-mark-selected` để highlight selected thread
- Support dark mode

## Bước 7: Testing

1. Test tạo comment mới:
   - Select text
   - Click "Add comment" button
   - Type comment
   - Save
   - Verify highlight xuất hiện

2. Test hiển thị comment:
   - Click vào highlighted text
   - Verify `FloatingThreadController` hiển thị thread

3. Test sidebar:
   - Add `ThreadsSidebar` component
   - Verify tất cả threads hiển thị

4. Test real-time:
   - Open 2 tabs
   - Create comment in tab 1
   - Verify comment appears in tab 2

## Notes:
- BlockNote tự động quản lý marks trong document
- `addThreadToDocument` được gọi khi tạo thread để tạo mark
- Reference/anchor được lưu trong ProseMirror marks, không trong database
- Comment body phải là BlockNote blocks (array), không có `id` fields

