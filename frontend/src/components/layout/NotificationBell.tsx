import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { workspaceApi } from "@/lib/api/workspaceApi";
import type { WorkspaceInvite } from "@/types/workspace";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

export function NotificationBell() {
  const { toast } = useToast();
  const { isLoaded, userId } = useAuth();
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const unreadCount = useMemo(() => invites.length, [invites]);

  const loadInvites = async () => {
    try {
      // Ensure auth header can be produced; avoid 401 spam when token not ready
      const headersCheck = await (await import("@/lib/api/authContext")).apiAuthContext.getAuthHeaders();
      if (!headersCheck || !("Authorization" in headersCheck)) {
        // Skip fetch until we have an Authorization header
        return;
      }
      const data = await workspaceApi.getMyInvites();
      setInvites(data);
    } catch (error) {
      // silent fail to avoid spamming toast
      // console.warn('Failed to load invites', error);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }
    // Initial fetch after auth is ready
    loadInvites();
    // Polling every 30s
    intervalRef.current = window.setInterval(loadInvites, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoaded, userId]);

  const handleAccept = async (inviteId: string) => {
    try {
      await workspaceApi.acceptInvite(inviteId);
      toast({ title: "Joined workspace", description: "Invite accepted successfully" });
      await loadInvites();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to accept invite", variant: "destructive" });
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await workspaceApi.declineInvite(inviteId);
      toast({ title: "Invite declined" });
      await loadInvites();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to decline invite", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hidden sm:flex hover-surface"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground rounded-full text-[10px] leading-4 text-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {invites.length === 0 && (
          <DropdownMenuItem className="text-sm text-muted-foreground">No new notifications</DropdownMenuItem>
        )}
        {invites.map((invite) => (
          <div key={invite.id} className="px-2 py-2">
            <div className="text-sm">
              You were invited to join a workspace
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{invite.email}</span>
              <span>{new Date(invite.expiresAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="xs" className="h-6 text-xs" onClick={() => handleAccept(invite.id)}>Accept</Button>
              <Button size="xs" variant="secondary" className="h-6 text-xs" onClick={() => handleDecline(invite.id)}>Decline</Button>
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


