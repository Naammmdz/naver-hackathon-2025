// REFACTORED VERSION - Follow BlockNote documentation exactly
// This is a simplified version that removes all workarounds and follows BlockNote's pattern

// Key insights from BlockNote source code:
// 1. CommentsPlugin automatically calls updateMarksFromThreads when:
//    - Editor is created: editor.onCreate(() => updateMarksFromThreads(threadStore.getThreads()))
//    - ThreadStore changes: threadStore.subscribe(updateMarksFromThreads)
// 2. updateMarksFromThreads only UPDATES existing marks, doesn't create new ones
// 3. When creating new thread, BlockNote automatically creates mark if addThreadToDocument is not implemented
// 4. Problem: When loading threads from backend, marks are not automatically created
// 5. Solution: Create marks from reference when loading threads, but use BlockNote's API correctly

// The refactored approach:
// - Create marks from reference when threads are loaded (one-time operation)
// - Use simple transaction to create marks (no manual re-render triggers)
// - Rely on BlockNote's automatic updateMarksFromThreads to handle updates
// - Cleanup orphan marks properly (only remove marks without text content)

