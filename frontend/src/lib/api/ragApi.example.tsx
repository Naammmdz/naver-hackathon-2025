/**
 * RAG API Usage Examples
 * 
 * This file demonstrates how to use the RAG API client and hooks
 * in your React components.
 */

import React from "react";
import { useWorkspaces, useDocuments, useRagQuery, useRagSessions } from "@/hooks/useRagApi";
import { ragApi } from "@/lib/api/ragApi";

// ============================================
// Example 1: Using Hooks in a React Component
// ============================================

export function WorkspaceExample() {
  const {
    loading,
    error,
    createWorkspace,
    listWorkspaces,
    getWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaces();

  const handleCreateWorkspace = async () => {
    const workspace = await createWorkspace({
      name: "My Workspace",
      description: "A workspace for my documents",
      owner_id: "user123",
    });

    if (workspace) {
      console.log("Workspace created:", workspace);
    } else {
      console.error("Failed to create workspace:", error);
    }
  };

  const handleListWorkspaces = async () => {
    const workspaces = await listWorkspaces("user123");
    console.log("Workspaces:", workspaces);
  };

  return (
    <div>
      <button onClick={handleCreateWorkspace} disabled={loading}>
        {loading ? "Creating..." : "Create Workspace"}
      </button>
      <button onClick={handleListWorkspaces} disabled={loading}>
        List Workspaces
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// ============================================
// Example 2: Document Upload
// ============================================

export function DocumentUploadExample() {
  const { loading, error, uploadDocument } = useDocuments();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadDocument(
      "workspace-id-123",
      file,
      "My Document"
    );

    if (result) {
      console.log("Document uploaded:", result);
      console.log(`Created ${result.chunks_created} chunks`);
    } else {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={loading}
        accept=".pdf,.docx,.txt,.md,.html"
      />
      {loading && <div>Uploading...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// ============================================
// Example 3: Query Documents with RAG
// ============================================

export function RagQueryExample() {
  const { loading, error, query } = useRagQuery();
  const [answer, setAnswer] = React.useState<string>("");
  const [citations, setCitations] = React.useState<any[]>([]);

  const handleQuery = async (question: string) => {
    const result = await query("workspace-id-123", {
      query: question,
      user_id: "user123",
      top_k: 5,
      include_memory: true,
    });

    if (result) {
      setAnswer(result.answer);
      setCitations(result.citations);
      console.log("Confidence:", result.confidence);
      console.log("Citations:", result.citations);
    } else {
      console.error("Query failed:", error);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Ask a question..."
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleQuery(e.currentTarget.value);
          }
        }}
      />
      {loading && <div>Thinking...</div>}
      {answer && (
        <div>
          <h3>Answer:</h3>
          <p>{answer}</p>
          {citations.length > 0 && (
            <div>
              <h4>Sources:</h4>
              <ul>
                {citations.map((citation, idx) => (
                  <li key={idx}>
                    {citation.document_name} (Page {citation.page_number})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// ============================================
// Example 4: Session Management
// ============================================

export function SessionExample() {
  const { loading, error, createSession, getHistory, deleteSession } = useRagSessions();
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const handleCreateSession = async () => {
    const session = await createSession({
      user_id: "user123",
      session_name: "My Conversation",
    });

    if (session) {
      setSessionId(session.session_id);
      console.log("Session created:", session);
    }
  };

  const handleGetHistory = async () => {
    if (!sessionId) return;

    const history = await getHistory(sessionId);
    if (history) {
      console.log("Conversation history:", history.messages);
    }
  };

  return (
    <div>
      <button onClick={handleCreateSession} disabled={loading}>
        Create Session
      </button>
      {sessionId && (
        <>
          <button onClick={handleGetHistory} disabled={loading}>
            Get History
          </button>
          <button
            onClick={() => deleteSession(sessionId)}
            disabled={loading}
          >
            Delete Session
          </button>
        </>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

// ============================================
// Example 5: Direct API Usage (without hooks)
// ============================================

export async function directApiExample() {
  // Health check
  const health = await ragApi.healthCheck();
  console.log("Service health:", health);

  // Create workspace
  const workspace = await ragApi.createWorkspace({
    name: "My Workspace",
    owner_id: "user123",
  });

  // Upload document
  const file = new File(["content"], "document.pdf", { type: "application/pdf" });
  const uploadResult = await ragApi.uploadDocument(
    workspace.workspace_id,
    file,
    "My Document"
  );

  // Query documents
  const queryResult = await ragApi.queryDocuments(workspace.workspace_id, {
    query: "What is this document about?",
    user_id: "user123",
  });

  console.log("Query result:", queryResult);
}

// ============================================
// Example 6: Complete Workflow
// ============================================

export async function completeWorkflowExample() {
  try {
    // 1. Check service health
    const health = await ragApi.healthCheck();
    if (health.status !== "healthy") {
      throw new Error("Service is not healthy");
    }

    // 2. Create or get workspace
    let workspace;
    const workspaces = await ragApi.listWorkspaces("user123");
    if (workspaces.length > 0) {
      workspace = workspaces[0];
    } else {
      workspace = await ragApi.createWorkspace({
        name: "My RAG Workspace",
        description: "Workspace for document Q&A",
        owner_id: "user123",
      });
    }

    // 3. Upload a document
    const file = new File(["document content"], "doc.pdf", {
      type: "application/pdf",
    });
    const uploadResult = await ragApi.uploadDocument(
      workspace.workspace_id,
      file
    );
    console.log(`Uploaded document with ${uploadResult.chunks_created} chunks`);

    // 4. Create a session
    const session = await ragApi.createSession({
      user_id: "user123",
      session_name: "Document Q&A Session",
    });

    // 5. Query the documents
    const queryResult = await ragApi.queryDocuments(workspace.workspace_id, {
      query: "Summarize the main points of the document",
      user_id: "user123",
      session_id: session.session_id,
      top_k: 5,
      include_memory: true,
    });

    console.log("Answer:", queryResult.answer);
    console.log("Citations:", queryResult.citations);

    // 6. Get conversation history
    const history = await ragApi.getConversationHistory(session.session_id);
    console.log("Conversation history:", history.messages);

    return queryResult;
  } catch (error) {
    console.error("Workflow error:", error);
    throw error;
  }
}

