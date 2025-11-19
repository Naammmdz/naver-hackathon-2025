# BlockNote Comments Refactor - Theo Documentation

## Hiểu cách BlockNote hoạt động (từ source code)

### 1. CommentsPlugin tự động quản lý marks

**File**: `node_modules/@blocknote/core/src/extensions/Comments/CommentsPlugin.ts`

- **Line 152**: `this.threadStore.subscribe(this.updateMarksFromThreads)` - Tự động update khi threads thay đổi
- **Line 154-156**: `editor.onCreate(() => { this.updateMarksFromThreads(this.threadStore.getThreads()); })` - Update khi editor được tạo
- **Line 95-132**: `updateMarksFromThreads` - Chỉ UPDATE marks đã tồn tại, không tạo marks mới

### 2. Khi tạo thread mới

**Line 321-361**: `createThread` method
- Nếu `addThreadToDocument` được implement → BlockNote gọi nó để lưu reference
- Nếu không → BlockNote tự động tạo mark: `editor._tiptapEditor.commands.setMark(markType, { threadId, orphan: false })`

### 3. Vấn đề hiện tại

- Khi load threads từ backend, marks không tự động được tạo trong document
- BlockNote chỉ update marks đã tồn tại, không tạo marks mới từ reference
- Code hiện tại có nhiều workaround/hack để trigger re-render

## Giải pháp đúng theo BlockNote

### Step 1: Load threads vào Yjs map (đã làm đúng)
- Threads được load từ backend và populate vào Yjs map
- BlockNote tự động subscribe và detect changes

### Step 2: Tạo marks từ reference khi load threads
- Chỉ tạo marks một lần khi threads được load lần đầu
- Sử dụng transaction đơn giản để tạo marks
- Không cần trigger re-render manually - BlockNote sẽ tự động làm qua `updateMarksFromThreads`

### Step 3: Cleanup orphan marks
- BlockNote đã có logic mark marks as `orphan: true` nếu thread không tồn tại
- Chúng ta chỉ cần cleanup marks không có text content (khi text bị xóa)

## Refactor Plan

### 1. Simplify mark restoration
- Remove tất cả manual re-render triggers
- Chỉ tạo marks từ reference một lần khi load threads
- Sử dụng transaction đơn giản

### 2. Remove workarounds
- Remove thread subscription listener (BlockNote đã có)
- Remove manual re-render triggers
- Remove verification code (không cần thiết)

### 3. Keep only essential logic
- Pre-load user data (cần thiết để tránh errors)
- Create marks from reference when loading threads
- Cleanup orphan marks in onChange (khi text bị xóa)

## Implementation

### Mark Restoration (Simplified)
```typescript
// When threads are loaded, create marks from reference
// Use simple transaction - BlockNote will handle updates automatically
const restoreMarksFromReference = (threads, tiptapEditor, commentMarkType) => {
  for (const [threadId, thread] of threads.entries()) {
    const reference = getReferenceFromThread(thread);
    if (reference && reference.selection?.prosemirror) {
      const { anchor, head } = reference.selection.prosemirror;
      // Validate positions and text content
      if (isValidPosition(anchor, head, doc) && hasTextContent(anchor, head, doc)) {
        // Create mark using simple transaction
        const tr = tiptapEditor.view.state.tr;
        const mark = commentMarkType.create({ threadId, orphan: false });
        tr.addMark(Math.min(anchor, head), Math.max(anchor, head), mark);
        tiptapEditor.view.dispatch(tr);
      }
    }
  }
};
```

### Cleanup Orphan Marks (Simplified)
```typescript
// In onChange handler, cleanup marks without text content
const cleanupOrphanMarks = (tiptapEditor, commentMarkType) => {
  const { state, doc } = tiptapEditor.view;
  const tr = state.tr;
  let hasOrphanMarks = false;
  
  doc.descendants((node, pos) => {
    if (node.isText) {
      node.marks.forEach((mark) => {
        if (mark.type === commentMarkType) {
          const textContent = node.text || '';
          if (!textContent || textContent.trim().length === 0) {
            tr.removeMark(pos, pos + node.nodeSize, commentMarkType);
            hasOrphanMarks = true;
          }
        }
      });
    }
  });
  
  if (hasOrphanMarks) {
    tiptapEditor.view.dispatch(tr);
  }
};
```

### Remove from threadStore
- Remove manual Yjs transaction trigger in `addThreadToDocument`
- BlockNote sẽ tự động detect changes qua subscribe

