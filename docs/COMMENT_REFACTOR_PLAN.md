# BlockNote Comments Refactor Plan

## Hiểu cách BlockNote hoạt động

Từ source code của BlockNote:

1. **CommentsPlugin tự động tạo/update marks**:
   - `editor.onCreate()` → gọi `updateMarksFromThreads(threadStore.getThreads())`
   - `threadStore.subscribe(updateMarksFromThreads)` → tự động update khi threads thay đổi
   - `updateMarksFromThreads` tìm tất cả marks trong document và update chúng dựa trên threads

2. **Khi tạo thread mới**:
   - Nếu `addThreadToDocument` được implement → BlockNote gọi nó để lưu reference
   - Nếu không → BlockNote tự động tạo mark: `editor._tiptapEditor.commands.setMark(markType, { threadId })`

3. **Vấn đề hiện tại**:
   - Khi load threads từ backend, marks không tự động được tạo trong document
   - BlockNote chỉ update marks đã tồn tại, không tạo marks mới từ reference
   - Chúng ta đang manually restore marks, nhưng có nhiều workaround/hack code

## Giải pháp đúng theo BlockNote

1. **Load threads vào Yjs map đúng cách** (đã làm đúng)
2. **Tạo marks từ reference khi load threads** - nhưng phải làm đúng cách:
   - Chỉ tạo marks khi threads được load lần đầu
   - Sử dụng BlockNote's API đúng cách
   - Không cần trigger re-render manually - BlockNote sẽ tự động làm

3. **Cleanup orphan marks** - BlockNote đã có logic này trong `updateMarksFromThreads`:
   - Marks được đánh dấu `orphan: true` nếu thread không tồn tại hoặc resolved/deleted
   - Chúng ta chỉ cần cleanup marks không có text content

## Refactor steps

1. Remove tất cả manual re-render triggers
2. Simplify mark restoration - chỉ tạo marks từ reference khi load threads
3. Rely on BlockNote's automatic mark updates
4. Cleanup orphan marks đúng cách (chỉ xóa marks không có text)

