import { Document, DocumentStore } from '@/types/document';
import { create } from 'zustand';
import api from '@/lib/api-config';

interface DocumentState extends DocumentStore {
  loading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  addDocument: (title?: string, parentId?: string) => Promise<string | undefined>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  permanentlyDeleteDocument: (id: string) => Promise<void>;
  setActiveDocument: (id: string | null) => void;
  getDocument: (id: string) => Document | undefined;
  getTrashedDocuments: () => Document[];
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  activeDocumentId: null,
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/documents');
      set({ documents: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch documents', loading: false });
    }
  },

  addDocument: async (title = 'Untitled', parentId) => {
    try {
      const response = await api.post('/documents', { title, parentId });
      set((state) => ({
        documents: [...state.documents, response.data],
        activeDocumentId: response.data.id,
      }));
      return response.data.id;
    } catch (error) {
      console.error('Failed to add document', error);
    }
  },

  updateDocument: async (id, updates) => {
    try {
      const response = await api.put(`/documents/${id}`, updates);
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? response.data : doc
        ),
      }));
    } catch (error) {
      console.error('Failed to update document', error);
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      set((state) => {
        const newDocuments = state.documents.map((doc) =>
          doc.id === id ? { ...doc, trashed: true } : doc
        );
        let newActiveId = state.activeDocumentId;
        if (state.activeDocumentId === id) {
          const availableDocs = newDocuments.filter((doc) => !doc.trashed);
          newActiveId = availableDocs.length > 0 ? availableDocs[0].id : null;
        }
        return {
          documents: newDocuments,
          activeDocumentId: newActiveId,
        };
      });
    } catch (error) {
      console.error('Failed to delete document', error);
    }
  },

  restoreDocument: async (id) => {
    try {
      await api.patch(`/documents/${id}/restore`);
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, trashed: false } : doc
        ),
      }));
    } catch (error) {
      console.error('Failed to restore document', error);
    }
  },

  permanentlyDeleteDocument: async (id) => {
    try {
      await api.delete(`/documents/${id}/permanent`);
      set((state) => {
        const newDocuments = state.documents.filter((doc) => doc.id !== id);
        let newActiveId = state.activeDocumentId;
        if (state.activeDocumentId === id) {
          newActiveId = newDocuments.length > 0 ? newDocuments[0].id : null;
        }
        return {
          documents: newDocuments,
          activeDocumentId: newActiveId,
        };
      });
    } catch (error) {
      console.error('Failed to permanently delete document', error);
    }
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
}));
