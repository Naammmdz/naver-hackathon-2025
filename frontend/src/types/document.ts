export interface Document {
  id: string;
  title: string;
  content: any[];
  createdAt: Date;
  updatedAt: Date;
  icon?: string | null;
  parentId?: string | null;
  trashed: boolean;
  trashedAt?: Date | null;
  userId: string;
}

export interface DocumentStore {
  documents: Document[];
  activeDocumentId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CreateDocumentInput {
  title: string;
  content: any[];
  icon?: string | null;
  parentId?: string | null;
  userId: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: any[];
  icon?: string | null;
  parentId?: string | null;
  userId?: string;
}
