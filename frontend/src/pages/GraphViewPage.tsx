import React from "react";
import { GraphView } from "@/components/GraphView";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useDocumentStore } from "@/store/documentStore";

export default function GraphViewPage() {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument);

  const handleNodeClick = (node: any) => {
    console.log("Node clicked:", node);
    
    // Open document if it's a note
    if (node.type === "note" && node.id.startsWith("doc_")) {
      const docId = node.id.replace("doc_", "");
      setActiveDocument(docId);
      // Optionally switch to docs view
      // You can dispatch an event or use a callback to change view
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

