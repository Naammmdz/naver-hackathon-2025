export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
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
  role: "owner" | "admin" | "member" | "viewer";
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
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string; // Email address of the invited user
  role: "admin" | "member" | "viewer";
  invitedBy: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: string;
  createdAt: string;
}
