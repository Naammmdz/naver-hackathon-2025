import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { workspaceApi } from "@/lib/api/workspaceApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { WorkspaceInvite } from "@/types/workspace";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

export function NotificationBell() {
  const { toast } = useToast();
  const { isLoaded, userId } = useAuth();
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const loadWorkspaces = useWorkspaceStore((state) => state.loadWorkspaces);
  const upsertWorkspace = useWorkspaceStore((state) => state.upsertWorkspace);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const { t } = useTranslation();

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
      const member = await workspaceApi.acceptInvite(inviteId);
      toast({ title: t('components.NotificationBell.joinedWorkspace'), description: t('components.NotificationBell.inviteAccepted') });
      // Reload invites and workspaces, then switch to the joined workspace
      await Promise.all([loadInvites(), loadWorkspaces()]);
      if (member?.workspaceId) {
        // Ensure the joined workspace exists in the list even if backend list lags
        try {
          const ws = await workspaceApi.getWorkspace(member.workspaceId);
          upsertWorkspace(ws);
        } catch {}
        setActiveWorkspace(member.workspaceId);
      }
    } catch (error: any) {
      toast({ title: t('components.NotificationBell.error'), description: error?.message || t('components.NotificationBell.failedToAcceptInvite'), variant: "destructive" });
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await workspaceApi.declineInvite(inviteId);
      toast({ title: t('components.NotificationBell.inviteDeclined') });
      await loadInvites();
    } catch (error: any) {
      toast({ title: t('components.NotificationBell.error'), description: error?.message || t('components.NotificationBell.failedToDeclineInvite'), variant: "destructive" });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hidden sm:flex hover-surface"
          aria-label={t('components.NotificationBell.ariaLabel')}
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
        <DropdownMenuLabel>{t('components.NotificationBell.notifications')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {invites.length === 0 && (
          <DropdownMenuItem className="text-sm text-muted-foreground">{t('components.NotificationBell.noNewNotifications')}</DropdownMenuItem>
        )}
        {invites.map((invite) => (
          <div key={invite.id} className="px-2 py-2">
            <div className="text-sm">
              {t('components.NotificationBell.invitedToJoinWorkspace')}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{invite.email}</span>
              <span>{new Date(invite.expiresAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" className="h-6 text-xs" onClick={() => handleAccept(invite.id)}>{t('components.NotificationBell.accept')}</Button>
              <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={() => handleDecline(invite.id)}>{t('components.NotificationBell.decline')}</Button>
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


