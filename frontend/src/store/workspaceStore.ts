import { workspaceApi } from "@/lib/api/workspaceApi";
import type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    Workspace,
    WorkspaceMember,
} from "@/types/workspace";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  upsertWorkspace: (workspace: Workspace) => void;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace | undefined>;
  updateWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  getActiveWorkspace: () => Workspace | undefined;

  // Members
  loadMembers: (workspaceId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: "ADMIN" | "MEMBER") => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: "ADMIN" | "MEMBER") => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      members: [],
      isLoading: false,
      error: null,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true, error: null });
        try {
          await get().loadWorkspaces();
          
          // Set first workspace as active if none selected
          const { workspaces, activeWorkspaceId } = get();
          if (!activeWorkspaceId && workspaces.length > 0) {
            set({ activeWorkspaceId: workspaces[0].id });
          }
          
          set({ isInitialized: true });
        } catch (error) {
          console.error("Failed to initialize workspaces:", error);
          set({ error: "Failed to load workspaces" });
        } finally {
          set({ isLoading: false });
        }
      },

      loadWorkspaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const workspaces = await workspaceApi.getWorkspaces();
          set({ workspaces, isLoading: false });
        } catch (error) {
          console.error("Failed to load workspaces:", error);
          // Set empty array on error so app doesn't break
          set({ workspaces: [], error: "Failed to load workspaces", isLoading: false });
        }
      },

      upsertWorkspace: (workspace: Workspace) => {
        set((state) => {
          const exists = state.workspaces.some((w) => w.id === workspace.id);
          return {
            workspaces: exists
              ? state.workspaces.map((w) => (w.id === workspace.id ? workspace : w))
              : [...state.workspaces, workspace],
          };
        });
      },

      createWorkspace: async (input: CreateWorkspaceInput) => {
        set({ isLoading: true, error: null });
        try {
          const workspace = await workspaceApi.createWorkspace(input);
          set((state) => ({
            workspaces: [...state.workspaces, workspace],
            activeWorkspaceId: workspace.id,
            isLoading: false,
          }));
          return workspace;
        } catch (error) {
          console.error("Failed to create workspace:", error);
          set({ error: "Failed to create workspace", isLoading: false });
          return undefined;
        }
      },

      updateWorkspace: async (id: string, input: UpdateWorkspaceInput) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await workspaceApi.updateWorkspace(id, input);
          set((state) => ({
            workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Failed to update workspace:", error);
          set({ error: "Failed to update workspace", isLoading: false });
        }
      },

      deleteWorkspace: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await workspaceApi.deleteWorkspace(id);
          set((state) => {
            const workspaces = state.workspaces.filter((w) => w.id !== id);
            const activeWorkspaceId =
              state.activeWorkspaceId === id
                ? workspaces.length > 0
                  ? workspaces[0].id
                  : null
                : state.activeWorkspaceId;
            return { workspaces, activeWorkspaceId, isLoading: false };
          });
        } catch (error) {
          console.error("Failed to delete workspace:", error);
          set({ error: "Failed to delete workspace", isLoading: false });
        }
      },

      setActiveWorkspace: (id: string | null) => {
        set({ activeWorkspaceId: id });
        if (id) {
          get().loadMembers(id);
        }
      },

      getActiveWorkspace: () => {
        const { workspaces, activeWorkspaceId } = get();
        return workspaces.find((w) => w.id === activeWorkspaceId);
      },

      loadMembers: async (workspaceId: string) => {
        try {
          const members = await workspaceApi.getMembers(workspaceId);
          set({ members });
        } catch (error) {
          console.error("Failed to load members:", error);
        }
      },

      inviteMember: async (workspaceId: string, email: string, role: "ADMIN" | "MEMBER") => {
        try {
          await workspaceApi.inviteMember(workspaceId, email, role);
          // Reload members after invite
          await get().loadMembers(workspaceId);
        } catch (error) {
          console.error("Failed to invite member:", error);
          throw error;
        }
      },

      removeMember: async (workspaceId: string, memberId: string) => {
        try {
          await workspaceApi.removeMember(workspaceId, memberId);
          set((state) => ({
            members: state.members.filter((m) => m.id !== memberId),
          }));
        } catch (error) {
          console.error("Failed to remove member:", error);
          throw error;
        }
      },

      updateMemberRole: async (workspaceId: string, memberId: string, role: "ADMIN" | "MEMBER") => {
        try {
          const updated = await workspaceApi.updateMemberRole(workspaceId, memberId, role);
          set((state) => ({
            members: state.members.map((m) => (m.id === memberId ? updated : m)),
          }));
        } catch (error) {
          console.error("Failed to update member role:", error);
          throw error;
        }
      },

      leaveWorkspace: async (workspaceId: string) => {
        try {
          await workspaceApi.leaveWorkspace(workspaceId);
          set((state) => {
            const workspaces = state.workspaces.filter((w) => w.id !== workspaceId);
            const activeWorkspaceId =
              state.activeWorkspaceId === workspaceId
                ? workspaces.length > 0
                  ? workspaces[0].id
                  : null
                : state.activeWorkspaceId;
            return { workspaces, activeWorkspaceId };
          });
        } catch (error) {
          console.error("Failed to leave workspace:", error);
          throw error;
        }
      },
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({ 
        activeWorkspaceId: state.activeWorkspaceId 
      }),
    }
  )
);
