/**
 * RAG API Types
 * Type definitions for the AI Service RAG API
 */

// Workspace Types
export interface WorkspaceCreate {
  name: string;
  description?: string;
  owner_id: string;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
}

export interface WorkspaceResponse {
  workspace_id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  document_count: number;
}

// Document Types
export interface DocumentResponse {
  document_id: string;
  workspace_id: string;
  title: string;
  source_path: string;
  source_type: string;
  total_pages?: number;
  total_chunks: number;
  file_size?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentStats {
  total_documents: number;
  total_chunks: number;
  total_size_bytes: number;
  documents_by_type: Record<string, number>;
}

export interface IngestResponse {
  document_id: string;
  title: string;
  chunks_created: number;
  status: string;
  message: string;
}

// Query Types
export interface Citation {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number?: number;
  chunk_text: string;
  score: number;
}

export interface QueryRequest {
  query: string;
  user_id?: string;
  session_id?: string;
  llm_provider?: string;
  top_k?: number;
  include_memory?: boolean;
  document_context?: {
    id: string;
    title: string;
    content: string;
    cursor_position?: number;
  };
}

export interface QueryResponse {
  query: string;
  answer: string;
  citations: Citation[];
  confidence: number;
  session_id: string;
  retrieval_stats: Record<string, any>;
  metadata: Record<string, any>;
}

// Session Types
export interface SessionCreate {
  user_id?: string;
  session_name?: string;
}

export interface SessionResponse {
  session_id: string;
  user_id: string;
  created_at: string;
}

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp: string;
  confidence?: number;
}

export interface ConversationHistory {
  session_id: string;
  messages: ConversationMessage[];
  total_messages: number;
}

// Health Types
export interface HealthResponse {
  status: string;
  database: string;
  llm_providers: Record<string, boolean>;
  version: string;
}

export interface ReadinessResponse {
  ready: boolean;
  checks: Record<string, boolean>;
}

