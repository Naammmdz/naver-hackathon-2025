import { workspaceApi } from "@/lib/api/workspaceApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth } from "@clerk/clerk-react";
import { Bell, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  status: string;
  createdAt: string;
}

export function InviteNotifications() {
  const { userId } = useAuth();
  const { refreshWorkspaces } = useWorkspaceStore();
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(false);

  console.log('[InviteNotifications] RENDER - userId:', userId, 'invites count:', invites.length);

  const loadInvites = async () => {
    if (!userId) {
      console.log('[InviteNotifications] loadInvites skipped - no userId');
      return;
    }
    try {
      console.log('[InviteNotifications] Loading invites for userId:', userId);
      const data = await workspaceApi.getMyInvites();
      console.log('[InviteNotifications] Loaded invites:', data);
      setInvites(data);
    } catch (error) {
      console.error("Failed to load invites:", error);
    }
  };

  useEffect(() => {
    console.log('[InviteNotifications] Component mounted, userId:', userId);
    loadInvites();
    
    // Listen for real-time invite notifications
    const handleInviteEvent = ((e: CustomEvent) => {
      console.log('[InviteNotifications] Received workspace-invite event:', e.detail);
      loadInvites(); // Reload invites when new one arrives
    }) as EventListener;
    
    window.addEventListener('workspace-invite', handleInviteEvent);
    console.log('[InviteNotifications] Event listener registered for workspace-invite');
    
    // Poll for new invites every 30 seconds as fallback
    const interval = setInterval(loadInvites, 30000);
    
    return () => {
      console.log('[InviteNotifications] Cleaning up event listener');
      window.removeEventListener('workspace-invite', handleInviteEvent);
      clearInterval(interval);
    };
  }, [userId]);

  const handleAccept = async (inviteId: string) => {
    setLoading(true);
    try {
      await workspaceApi.acceptInvite(inviteId);
      await loadInvites();
      await refreshWorkspaces();
    } catch (error) {
      console.error("Failed to accept invite:", error);
      alert("Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (inviteId: string) => {
    setLoading(true);
    try {
      await workspaceApi.rejectInvite(inviteId);
      await loadInvites();
    } catch (error) {
      console.error("Failed to reject invite:", error);
      alert("Failed to reject invite");
    } finally {
      setLoading(false);
    }
  };

  const pendingInvites = invites.filter(inv => inv.status === 'pending');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingInvites.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {pendingInvites.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Workspace Invitations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pendingInvites.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          pendingInvites.map((invite) => (
            <DropdownMenuItem key={invite.id} className="flex-col items-start p-4 gap-2">
              <div className="flex flex-col gap-1 w-full">
                <div className="font-medium">Workspace Invitation</div>
                <div className="text-sm text-muted-foreground">
                  Invited by: {invite.invitedBy}
                </div>
                <div className="text-xs text-muted-foreground">
                  Role: {invite.role}
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAccept(invite.id)}
                  disabled={loading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleReject(invite.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
