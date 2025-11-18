import React from "react";
import { GraphView } from "@/components/GraphView";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useDocumentStore } from "@/store/documentStore";
import { useBoardStore } from "@/store/boardStore";

interface GraphViewPageProps {
  onViewChange?: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph') => void;
}

export default function GraphViewPage({ onViewChange }: GraphViewPageProps) {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument);
  const setActiveBoard = useBoardStore((state) => state.setActiveBoard);

  const handleNodeClick = (node: any) => {
    console.log("Node clicked:", node);
    
    if (!onViewChange) return;

    // Extract ID from node (could be "doc_xxx", "task_xxx", "board_xxx", etc.)
    const nodeId = node.id || '';
    
    // Handle different node types
    switch (node.type) {
      case "note":
        // Document node - navigate to docs view and open document
        if (nodeId.startsWith("doc_")) {
          const docId = nodeId.replace("doc_", "");
          setActiveDocument(docId);
          onViewChange('docs');
        } else {
          // Try to use nodeId directly as document ID
          setActiveDocument(nodeId);
          onViewChange('docs');
        }
        break;
        
      case "project":
        // Project node - navigate to tasks view
        onViewChange('tasks');
        break;
        
      case "folder":
        // Folder node - navigate to docs view (folders contain documents)
        onViewChange('docs');
        break;
        
      case "tag":
        // Tag node - navigate to tasks view (tags are often used for tasks)
        onViewChange('tasks');
        break;
        
      default:
        // Unknown type - try to detect from ID
        if (nodeId.startsWith("doc_")) {
          const docId = nodeId.replace("doc_", "");
          setActiveDocument(docId);
          onViewChange('docs');
        } else if (nodeId.startsWith("task_")) {
          onViewChange('tasks');
        } else if (nodeId.startsWith("board_")) {
          const boardId = nodeId.replace("board_", "");
          setActiveBoard(boardId);
          onViewChange('board');
        } else {
          // Default to home
          onViewChange('home');
        }
    }
  };

  return (
    <div className="h-full w-full">
      <GraphView 
        workspaceId={activeWorkspaceId || undefined} 
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}

