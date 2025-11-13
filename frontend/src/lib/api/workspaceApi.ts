import type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from "@/types/workspace";
import { apiAuthContext } from "./authContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8989";

export const workspaceApi = {
  // Get all workspaces for current user
  async getWorkspaces(): Promise<Workspace[]> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch workspaces");
    return response.json();
  },

  // Get single workspace
  async getWorkspace(id: string): Promise<Workspace> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${id}`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch workspace");
    return response.json();
  },

  // Create workspace
  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const headers = await apiAuthContext.getAuthHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to create workspace");
    return response.json();
  },

  // Update workspace
  async updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const headers = await apiAuthContext.getAuthHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${id}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to update workspace");
    return response.json();
  },

  // Delete workspace
  async deleteWorkspace(id: string): Promise<void> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${id}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete workspace");
  },

  // Get workspace members
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch members");
    return response.json();
  },

  // Invite member
  async inviteMember(
    workspaceId: string,
    email: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<WorkspaceInvite> {
    const headers = await apiAuthContext.getAuthHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/invites`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ email, role }),
    });
    if (!response.ok) throw new Error("Failed to invite member");
    return response.json();
  },

  // Remove member
  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to remove member");
  },

  // Update member role
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<WorkspaceMember> {
    const headers = await apiAuthContext.getAuthHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error("Failed to update member role");
    return response.json();
  },

  // Leave workspace
  async leaveWorkspace(workspaceId: string): Promise<void> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/leave`, {
      method: "POST",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to leave workspace");
  },

  // Get workspace invites
  async getInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/invites`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch invites");
    return response.json();
  },

  // Get my invites
  async getMyInvites(): Promise<WorkspaceInvite[]> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invites`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch my invites");
    return response.json();
  },

  // Accept invite
  async acceptInvite(inviteId: string): Promise<WorkspaceMember> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invites/${inviteId}/accept`, {
      method: "POST",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to accept invite");
    return response.json();
  },

  // Decline invite
  async declineInvite(inviteId: string): Promise<void> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invites/${inviteId}/decline`, {
      method: "POST",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to decline invite");
  },

  // Join public workspace
  async joinPublicWorkspace(workspaceId: string): Promise<WorkspaceMember> {
    const headers = await apiAuthContext.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/join`, {
      method: "POST",
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to join workspace");
    return response.json();
  },
};
