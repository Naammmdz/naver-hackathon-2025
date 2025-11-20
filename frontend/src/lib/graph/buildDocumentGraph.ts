import type { Document } from "@/types/document";
import type { GraphData } from "@/lib/api/graphApi";

export function buildDocumentGraph(documents: Document[]): GraphData {
  const activeDocs = documents.filter((doc) => !doc.trashed);

  if (activeDocs.length === 0) {
    return {
      nodes: [],
      links: [],
    };
  }

  const childCount = new Map<string, number>();

  activeDocs.forEach((doc) => {
    if (doc.parentId) {
      childCount.set(doc.parentId, (childCount.get(doc.parentId) || 0) + 1);
    }
  });

  const nodes = activeDocs.map((doc) => ({
    id: doc.id,
    label: doc.title || "Untitled",
    type: childCount.get(doc.id) ? "folder" : "note",
  }));

  const docIdSet = new Set(activeDocs.map((doc) => doc.id));

  const links = activeDocs
    .filter((doc) => doc.parentId && docIdSet.has(doc.parentId))
    .map((doc) => ({
      source: doc.parentId as string,
      target: doc.id,
    }));

  return {
    nodes,
    links,
  };
}

