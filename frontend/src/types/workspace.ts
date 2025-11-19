export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  allowInvites?: boolean;
  settings?: WorkspaceSettings;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowInvites: boolean;
  defaultTaskView?: "list" | "board" | "calendar";
  defaultDocumentView?: "list" | "grid";
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  fullName?: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  allowInvites?: boolean;
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}
