export interface BoardSnapshot {
  elements: unknown[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface Board {
  id: string;
  title: string;
  snapshot: BoardSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId?: string; // Add workspace support
}

export interface CreateBoardInput {
  title: string;
  snapshot?: BoardSnapshot | null;
  userId: string;
  workspaceId?: string; // Add workspace support
}

export interface UpdateBoardInput {
  id: string;
  title?: string;
  snapshot?: BoardSnapshot | null;
  userId?: string;
  workspaceId?: string; // Add workspace support
}
