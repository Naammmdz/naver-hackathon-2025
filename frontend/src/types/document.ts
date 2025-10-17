export interface Document {
  id: string;
  title: string;
  content: any[]; // BlockNote content
  createdAt: number;
  updatedAt: number;
  icon?: string;
  parentId?: string; // For nested documents
  trashed?: boolean; // Whether document is in trash
  trashedAt?: number; // When document was moved to trash
}

export interface DocumentStore {
  documents: Document[];
  activeDocumentId: string | null;
}
