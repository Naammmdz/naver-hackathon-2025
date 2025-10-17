import { Document, DocumentStore } from '@/types/document';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DocumentState extends DocumentStore {
  addDocument: (title?: string, parentId?: string) => string;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  restoreDocument: (id: string) => void;
  permanentlyDeleteDocument: (id: string) => void;
  setActiveDocument: (id: string | null) => void;
  getDocument: (id: string) => Document | undefined;
  getTrashedDocuments: () => Document[];
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      activeDocumentId: null,

      addDocument: (title = 'Untitled', parentId) => {
        const newDoc: Document = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          content: [
            {
              type: 'heading',
              content: title,
              props: { level: 1 },
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          icon: '📄',
          parentId,
        };

        set((state) => ({
          documents: [...state.documents, newDoc],
          activeDocumentId: newDoc.id,
        }));

        return newDoc.id;
      },

      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, ...updates, updatedAt: Date.now() }
              : doc
          ),
        }));
      },

      deleteDocument: (id) => {
        set((state) => {
          const newDocuments = state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, trashed: true, trashedAt: Date.now() }
              : doc
          );
          let newActiveId = state.activeDocumentId;

          // If deleting active document, select another non-trashed one
          if (state.activeDocumentId === id) {
            const availableDocs = newDocuments.filter(doc => !doc.trashed);
            newActiveId = availableDocs.length > 0 ? availableDocs[0].id : null;
          }

          return {
            documents: newDocuments,
            activeDocumentId: newActiveId,
          };
        });
      },

      restoreDocument: (id) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id
              ? { ...doc, trashed: false, trashedAt: undefined }
              : doc
          ),
        }));
      },

      permanentlyDeleteDocument: (id) => {
        set((state) => {
          const newDocuments = state.documents.filter((doc) => doc.id !== id);
          let newActiveId = state.activeDocumentId;

          // If permanently deleting active document, select another one
          if (state.activeDocumentId === id) {
            newActiveId = newDocuments.length > 0 ? newDocuments[0].id : null;
          }

          return {
            documents: newDocuments,
            activeDocumentId: newActiveId,
          };
        });
      },

      setActiveDocument: (id) => {
        set({ activeDocumentId: id });
      },

      getDocument: (id) => {
        return get().documents.find((doc) => doc.id === id);
      },

      getTrashedDocuments: () => {
        return get().documents.filter((doc) => doc.trashed);
      },
    }),
    {
      name: 'document-storage',
    }
  )
);
