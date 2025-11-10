import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { Document } from '@/types/document';
import { useDocumentStore } from '@/store/documentStore';

interface UseDocumentYjsSyncOptions {
  documentsMap: Y.Map<any> | null;
  docContentMap: Y.Map<Y.Text> | null;
  enabled?: boolean;
}

export function useDocumentYjsSync({ 
  documentsMap, 
  docContentMap,
  enabled = true 
}: UseDocumentYjsSyncOptions) {
  const { documents, updateDocument } = useDocumentStore();
  const mergeDocumentsLocal = useDocumentStore(s => s.mergeDocumentsLocal);
  const setDocumentContentLocal = useDocumentStore(s => s.setDocumentContentLocal);
  const isSyncingRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);
  const lastDocumentsRef = useRef<string>(JSON.stringify(documents));

  // Sync documents from Zustand to Yjs
  useEffect(() => {
    if (!enabled || !documentsMap || isSyncingRef.current) {
      return;
    }

    const schedule = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        pushToYjs();
      }, 100); // Debounce 100ms similar to task sync
    };

    const pushToYjs = () => {
      if (!documentsMap) return;
      const currentDocsJson = JSON.stringify(documents.map(d => ({
        id: d.id,
        title: d.title,
        icon: d.icon,
        parentId: d.parentId,
        trashed: d.trashed,
        trashedAt: d.trashedAt?.toISOString(),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        userId: d.userId,
        workspaceId: d.workspaceId,
      })));
      
      if (currentDocsJson === lastDocumentsRef.current) {
        return;
      }
      
      isSyncingRef.current = true;
      try {
        documents.forEach((doc) => {
          const docKey = doc.id;
          const existing = documentsMap.get(docKey);
          const docData = {
            id: doc.id,
            title: doc.title,
            icon: doc.icon,
            parentId: doc.parentId,
            trashed: doc.trashed,
            trashedAt: doc.trashedAt?.toISOString() || null,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            userId: doc.userId,
            workspaceId: doc.workspaceId,
          };
          // Only update if data actually changed
          if (!existing || JSON.stringify(existing) !== JSON.stringify(docData)) {
            documentsMap.set(docKey, docData);
          }
        });
        lastDocumentsRef.current = currentDocsJson;
      } catch (error) {
        console.error('Failed to sync documents to Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    schedule();

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [documents, documentsMap, enabled]);

  // Sync documents from Yjs to Zustand
  useEffect(() => {
    if (!enabled || !documentsMap) return;

    const handleYjsUpdate = () => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        const incoming: Array<Pick<Document, 'id'|'title'|'createdAt'|'updatedAt'|'userId'|'workspaceId'|'icon'|'parentId'|'trashed'|'trashedAt'>> = [];
        documentsMap.forEach((value, key) => {
          try {
            incoming.push({
              id: key,
              title: value.title,
              createdAt: new Date(value.createdAt),
              updatedAt: new Date(value.updatedAt),
              userId: value.userId,
              workspaceId: value.workspaceId,
              icon: value.icon || null,
              parentId: value.parentId || null,
              trashed: value.trashed || false,
              trashedAt: value.trashedAt ? new Date(value.trashedAt) : null,
            });
          } catch (err) {
            console.warn('Failed to parse document from Yjs:', key, err);
          }
        });
        
        if (incoming.length) {
          // Merge locally without hitting the API to avoid feedback loops
          mergeDocumentsLocal(incoming);
        }
      } catch (error) {
        console.error('Failed to sync documents from Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    documentsMap.observe(handleYjsUpdate);

    return () => {
      documentsMap.unobserve(handleYjsUpdate);
    };
  }, [documentsMap, enabled, mergeDocumentsLocal]);

  // Expose global flag for Yjs availability
  useEffect(() => {
    if (!enabled || !documentsMap || !docContentMap) return;

    (window as any).__WORKSPACE_YJS_ACTIVE = true;

    return () => {
      delete (window as any).__WORKSPACE_YJS_ACTIVE;
    };
  }, [documentsMap, docContentMap, enabled]);
}

