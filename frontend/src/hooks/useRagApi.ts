/**
 * React Hooks for RAG API
 * Custom hooks for interacting with the AI Service RAG API
 */

import { useState, useCallback } from "react";
import { ragApi } from "@/lib/api/ragApi";
import type {
  WorkspaceCreate,
  WorkspaceUpdate,
  WorkspaceResponse,
  DocumentResponse,
  DocumentListResponse,
  QueryRequest,
  QueryResponse,
  SessionCreate,
  SessionResponse,
  ConversationHistory,
  IngestResponse,
} from "@/types/rag";

/**
 * Hook for workspace management
 */
export function useWorkspaces() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createWorkspace = useCallback(
    async (data: WorkspaceCreate): Promise<WorkspaceResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.createWorkspace(data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getWorkspace = useCallback(
    async (workspaceId: string): Promise<WorkspaceResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.getWorkspace(workspaceId);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const listWorkspaces = useCallback(
    async (ownerId?: string): Promise<WorkspaceResponse[]> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.listWorkspaces(ownerId);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateWorkspace = useCallback(
    async (
      workspaceId: string,
      data: WorkspaceUpdate
    ): Promise<WorkspaceResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.updateWorkspace(workspaceId, data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ragApi.deleteWorkspace(workspaceId);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Hook for document management
 */
export function useDocuments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadDocument = useCallback(
    async (
      workspaceId: string,
      file: File,
      title?: string
    ): Promise<IngestResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.uploadDocument(workspaceId, file, title);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const listDocuments = useCallback(
    async (
      workspaceId: string,
      page: number = 1,
      pageSize: number = 50
    ): Promise<DocumentListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.listDocuments(workspaceId, page, pageSize);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getDocument = useCallback(
    async (
      workspaceId: string,
      documentId: string
    ): Promise<DocumentResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.getDocument(workspaceId, documentId);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteDocument = useCallback(
    async (workspaceId: string, documentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ragApi.deleteDocument(workspaceId, documentId);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    uploadDocument,
    listDocuments,
    getDocument,
    deleteDocument,
  };
}

/**
 * Hook for querying documents with RAG
 */
export function useRagQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const query = useCallback(
    async (
      workspaceId: string,
      requestData: QueryRequest
    ): Promise<QueryResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.queryDocuments(workspaceId, requestData);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    query,
  };
}

/**
 * Hook for session management
 */
export function useRagSessions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = useCallback(
    async (data?: SessionCreate): Promise<SessionResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.createSession(data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getHistory = useCallback(
    async (
      sessionId: string,
      limit: number = 50
    ): Promise<ConversationHistory | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await ragApi.getConversationHistory(sessionId, limit);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ragApi.deleteSession(sessionId);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createSession,
    getHistory,
    deleteSession,
  };
}

