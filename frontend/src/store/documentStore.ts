import { documentApi } from "@/lib/api/documentApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type {
    Document,
    DocumentStore,
    UpdateDocumentInput
} from "@/types/document";
import { create } from "zustand";

const SAVE_INTERVAL_MS = 600;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

type DocumentState = DocumentStore & {
  currentUserId: string | null;
  loadDocuments: () => Promise<void>;
  addDocument: (title?: string, parentId?: string | null) => Promise<string | undefined>;
  updateDocument: (id: string, updates: UpdateDocumentInput) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  permanentlyDeleteDocument: (id: string) => Promise<void>;
  setActiveDocument: (id: string | null) => void;
  getDocument: (id: string) => Document | undefined;
  getTrashedDocuments: () => Document[];
  setCurrentUser: (userId: string | null) => void;
  // Local-only helpers for Yjs sync
  mergeDocumentsLocal: (incoming: Array<Pick<Document, 'id'|'title'|'createdAt'|'updatedAt'|'userId'|'workspaceId'|'icon'|'parentId'|'trashed'|'trashedAt'>>) => void;
  setDocumentContentLocal: (id: string, content: any[]) => void;
  setDocumentTitleLocal: (id: string, title: string) => void;
};

const defaultContent = (title: string) => [
  {
    type: "heading",
    content: title,
    props: { level: 1 },
  },
];

const mergeDocuments = (existing: Document[], updates: Document[]): Document[] => {
  const map = new Map(existing.map((doc) => [doc.id, doc]));
  updates.forEach((doc) => map.set(doc.id, doc));
  return Array.from(map.values());
};

const findFirstActiveDocumentId = (documents: Document[]): string | null => {
  const doc = documents.find((document) => !document.trashed);
  return doc ? doc.id : null;
};

export const useDocumentStore = create<DocumentState>((set, get) => {
  const persistDocument = async (id: string, retryCount = 0) => {
    const document = get().documents.find((doc) => doc.id === id);
    if (!document) {
      return;
    }

    try {
      const saved = await documentApi.update(
        id,
        {
          title: document.title,
          content: document.content,
          icon: document.icon ?? undefined,
          parentId: document.parentId ?? undefined,
        },
        document,
      );
      set((state) => ({
        documents: state.documents.map((doc) => (doc.id === saved.id ? saved : doc)),
        error: null,
      }));
    } catch (error) {
      // Handle 401 errors with retry logic
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isUnauthorized = errorMessage?.includes('401') || errorMessage?.includes('Unauthorized');
      
      if (isUnauthorized && retryCount < 2) {
        // Retry after a delay to allow token refresh
        console.warn(`[DocumentStore] Unauthorized error saving document ${id}, retrying... (${retryCount + 1}/2)`);
        setTimeout(() => {
          persistDocument(id, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
        return;
      }
      
      // Only set error if it's not a 401 or we've exhausted retries
      if (!isUnauthorized || retryCount >= 2) {
        set({
          error: errorMessage,
        });
      }
    }
  };

  const scheduleSave = (id: string) => {
    if (typeof window === "undefined") {
      void persistDocument(id);
      return;
    }

    if (saveTimers.has(id)) {
      clearTimeout(saveTimers.get(id));
    }

    saveTimers.set(
      id,
      window.setTimeout(() => {
        saveTimers.delete(id);
        void persistDocument(id);
      }, SAVE_INTERVAL_MS),
    );
  };

  return {
    documents: [],
    activeDocumentId: null,
    isLoading: false,
    error: null,
    currentUserId: null,

    loadDocuments: async () => {
      const userId = get().currentUserId;
      if (!userId) {
        set({ documents: [], activeDocumentId: null, isLoading: false });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const [activeDocs, trashedDocs] = await Promise.all([
          activeWorkspaceId ? documentApi.listByWorkspace(activeWorkspaceId) : documentApi.list(),
          documentApi.listTrashed(),
        ]);
        const merged = mergeDocuments(activeDocs, trashedDocs);
        const documents = activeWorkspaceId
          ? merged.filter((doc) => doc.workspaceId === activeWorkspaceId)
          : merged.filter((doc) => doc.userId === userId);
        set((state) => ({
          documents,
          activeDocumentId:
            state.activeDocumentId && documents.some((doc) => doc.id === state.activeDocumentId)
              ? state.activeDocumentId
              : findFirstActiveDocumentId(documents),
          isLoading: false,
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      }
    },

    addDocument: async (title = "Untitled", parentId = null) => {
      const userId = get().currentUserId;
      if (!userId) {
        set({ error: "Bạn cần đăng nhập để tạo tài liệu mới." });
        return undefined;
      }

      try {
        const workspaceId = useWorkspaceStore.getState().activeWorkspaceId ?? undefined;
        const created = await documentApi.create({
          title,
          content: defaultContent(title),
          icon: "📄",
          parentId,
          userId,
          workspaceId,
        });

        set((state) => ({
          documents: [...state.documents, created],
          activeDocumentId: created.trashed
            ? state.activeDocumentId ?? findFirstActiveDocumentId(state.documents)
            : created.id,
          error: null,
        }));

        return created.id;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    updateDocument: async (id, updates) => {
      const existing = get().documents.find((doc) => doc.id === id);
      if (!existing) {
        return;
      }

      const updated: Document = {
        ...existing,
        ...("title" in updates ? { title: updates.title ?? existing.title } : {}),
        ...("content" in updates ? { content: updates.content ?? existing.content } : {}),
        ...("icon" in updates ? { icon: updates.icon ?? null } : {}),
        ...("parentId" in updates ? { parentId: updates.parentId ?? null } : {}),
        updatedAt: new Date(),
      };

      set((state) => ({
        documents: state.documents.map((doc) => (doc.id === id ? updated : doc)),
      }));

      scheduleSave(id);
    },

    deleteDocument: async (id) => {
      try {
        await documentApi.delete(id);
        set((state) => {
          const updatedDocuments = state.documents.map((doc) =>
            doc.id === id
              ? {
                  ...doc,
                  trashed: true,
                  trashedAt: new Date(),
                }
              : doc,
          );

          const newActiveId =
            state.activeDocumentId === id
              ? findFirstActiveDocumentId(updatedDocuments.filter((doc) => !doc.trashed))
              : state.activeDocumentId;

          return {
            documents: updatedDocuments,
            activeDocumentId: newActiveId,
            error: null,
          };
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    restoreDocument: async (id) => {
      try {
        await documentApi.restore(id);
        const refreshed = await documentApi.get(id);
        set((state) => ({
          documents: state.documents.map((doc) => (doc.id === refreshed.id ? refreshed : doc)),
          error: null,
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    permanentlyDeleteDocument: async (id) => {
      try {
        await documentApi.deletePermanent(id);
        set((state) => {
          const documents = state.documents.filter((doc) => doc.id !== id);
          const newActiveId =
            state.activeDocumentId === id
              ? findFirstActiveDocumentId(documents)
              : state.activeDocumentId;
          return {
            documents,
            activeDocumentId: newActiveId,
            error: null,
          };
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    setCurrentUser: (userId) => {
      set((state) => ({
        currentUserId: userId,
        documents:
          userId && userId === state.currentUserId
            ? state.documents
            : [],
        activeDocumentId:
          userId && userId === state.currentUserId
            ? state.activeDocumentId
            : null,
        error: null,
        isLoading: false,
      }));
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

  // Local-only updates used by Yjs to prevent API feedback loops
  mergeDocumentsLocal: (incoming: Array<Pick<Document, 'id'|'title'|'createdAt'|'updatedAt'|'userId'|'workspaceId'|'icon'|'parentId'|'trashed'|'trashedAt'>>) => {
    set((state) => {
      const map = new Map(state.documents.map((d) => [d.id, d] as const));
      for (const d of incoming) {
        const prev = map.get(d.id);
        const merged: Document = {
          id: d.id,
          title: d.title,
          content: prev?.content || defaultContent(d.title),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          userId: d.userId ?? prev?.userId ?? '',
          workspaceId: d.workspaceId ?? prev?.workspaceId ?? undefined,
          icon: d.icon ?? prev?.icon ?? null,
          parentId: d.parentId ?? prev?.parentId ?? null,
          trashed: d.trashed ?? prev?.trashed ?? false,
          trashedAt: d.trashedAt ?? prev?.trashedAt ?? null,
        };
        map.set(d.id, merged);
      }
      return { documents: Array.from(map.values()) };
    });
  },

  setDocumentContentLocal: (id: string, content: any[]) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, content, updatedAt: new Date() } : d)),
    }));
  },

  // Local-only title update to prevent editor re-render and cursor loss
  setDocumentTitleLocal: (id: string, title: string) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, title, updatedAt: new Date() } : d)),
    }));
  },
};
});
