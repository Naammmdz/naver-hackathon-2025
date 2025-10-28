export interface BoardSnapshot {
  elements: unknown[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface Board {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  snapshot: BoardSnapshot | null;
}

export interface CreateBoardInput {
  title: string;
  snapshot?: BoardSnapshot | null;
}

export interface UpdateBoardInput {
  id: string;
  title?: string;
  snapshot?: BoardSnapshot | null;
}
