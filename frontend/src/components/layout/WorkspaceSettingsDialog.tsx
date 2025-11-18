import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { workspaceApi } from "@/lib/api/workspaceApi";
import { useAuth } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Mail, Plus, UserPlus } from "lucide-react";
import type { WorkspaceInvite, WorkspaceMember } from "@/types/workspace";

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
}: WorkspaceSettingsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser, isLoaded: isAuthLoaded } = useAuth();
  const { activeWorkspaceId, workspaces, updateWorkspace, loadMembers, inviteMember, removeMember, updateMemberRole } = useWorkspaceStore();
  
  // Debug: log when currentUser changes
  useEffect(() => {
    console.log('[WorkspaceSettings] Current user state:', {
      isAuthLoaded,
      currentUserId: currentUser?.id,
      currentUserFullName: currentUser?.fullName,
      currentUserEmail: currentUser?.primaryEmailAddress?.emailAddress,
      currentUser: currentUser,
    });
  }, [currentUser, isAuthLoaded]);
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentUserMember = members.find((m) => m.userId === currentUser?.id);
  const isOwner = activeWorkspace?.ownerId === currentUser?.id;
  const isAdmin = currentUserMember?.role === "ADMIN" || isOwner;

  useEffect(() => {
    if (open && activeWorkspaceId) {
      loadData();
    }
  }, [open, activeWorkspaceId]);

  const loadData = async () => {
    if (!activeWorkspaceId) return;
    
    setIsLoading(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        workspaceApi.getMembers(activeWorkspaceId),
        workspaceApi.getInvites(activeWorkspaceId).catch(() => []), // Ignore if no permission
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (error) {
      console.error("Failed to load workspace data:", error);
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: t("components.WorkSpaceSettingDialog.failedToLoadWorkspaceSettings"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!activeWorkspaceId) return;
    
    try {
      await updateWorkspace(activeWorkspaceId, { isPublic: checked });
      toast({
        title: t("components.WorkSpaceSettingDialog.success"),
        description: checked ? t("components.WorkSpaceSettingDialog.workspaceIsNowPublic") : t("components.WorkSpaceSettingDialog.workspaceIsNowPrivate"),
      });
    } catch (error) {
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: t("components.WorkSpaceSettingDialog.failedToUpdateWorkspace"),
        variant: "destructive",
      });
    }
  };

  const handleToggleAllowInvites = async (checked: boolean) => {
    if (!activeWorkspaceId) return;
    
    try {
      await updateWorkspace(activeWorkspaceId, { allowInvites: checked });
      toast({
        title: t("components.WorkSpaceSettingDialog.success"),
        description: checked ? t("components.WorkSpaceSettingDialog.invitesEnabled") : t("components.WorkSpaceSettingDialog.invitesDisabled"),
      });
    } catch (error) {
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: t("components.WorkSpaceSettingDialog.failedToUpdateWorkspace"),
        variant: "destructive",
      });
    }
  };

  const handleInvite = async () => {
    if (!activeWorkspaceId || !inviteEmail.trim()) return;
    
    try {
      await inviteMember(activeWorkspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      toast({
        title: t("components.WorkSpaceSettingDialog.success"),
        description: t("components.WorkSpaceSettingDialog.inviteSentSuccessfully"),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: error.message || t("components.WorkSpaceSettingDialog.failedToSendInvite"),
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    
    try {
      await removeMember(activeWorkspaceId, memberId);
      toast({
        title: t("components.WorkSpaceSettingDialog.success"),
        description: t("components.WorkSpaceSettingDialog.memberRemoved"),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: error.message || t("components.WorkSpaceSettingDialog.failedToRemoveMember"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, role: "ADMIN" | "MEMBER") => {
    if (!activeWorkspaceId) return;
    
    try {
      await updateMemberRole(activeWorkspaceId, memberId, role);
      toast({
        title: t("components.WorkSpaceSettingDialog.success"),
        description: t("components.WorkSpaceSettingDialog.memberRoleUpdated"),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t("components.WorkSpaceSettingDialog.error"),
        description: error.message || t("components.WorkSpaceSettingDialog.failedToUpdateRole"),
        variant: "destructive",
      });
    }
  };

  if (!activeWorkspace) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("components.WorkSpaceSettingDialog.workspaceSettings")}</DialogTitle>
          <DialogDescription>
            {t("components.WorkSpaceSettingDialog.manageWorkspaceSettingsAndMembers")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("components.WorkSpaceSettingDialog.generalSettings")}</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">{t("components.WorkSpaceSettingDialog.publicWorkspace")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("components.WorkSpaceSettingDialog.allowAnyoneToJoin")}
                </p>
              </div>
              <Switch
                id="public"
                checked={activeWorkspace.isPublic || false}
                onCheckedChange={handleTogglePublic}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="invites">{t("components.WorkSpaceSettingDialog.allowInvites")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("components.WorkSpaceSettingDialog.allowMembersToInvite")}
                </p>
              </div>
              <Switch
                id="invites"
                checked={activeWorkspace.allowInvites !== false}
                onCheckedChange={handleToggleAllowInvites}
              />
            </div>
          </div>

          {/* Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("components.WorkSpaceSettingDialog.members")}</h3>
              {isOwner && (
                <Badge variant="secondary">{members.length} {t("components.WorkSpaceSettingDialog.members")}</Badge>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("components.WorkSpaceSettingDialog.user")}</TableHead>
                  <TableHead>{t("components.WorkSpaceSettingDialog.role")}</TableHead>
                  <TableHead>{t("components.WorkSpaceSettingDialog.joined")}</TableHead>
                  <TableHead className="text-right">{t("components.WorkSpaceSettingDialog.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  // Debug: log all members and current user
                  console.log('[WorkspaceSettings] Member check:', {
                    memberUserId: member.userId,
                    currentUserId: currentUser?.id,
                    isMatch: currentUser?.id === member.userId,
                    currentUserExists: !!currentUser,
                    memberUserInfo: member.user,
                  });
                  
                  // Use current user info if this is the current user
                  // Normalize both IDs for comparison (trim and case-insensitive)
                  const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
                  const isCurrentUser = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser.id);
                  
                  // Format userId for display if no user info available
                  const formatUserId = (userId: string) => {
                    if (userId.length > 20) {
                      return `User ${userId.substring(userId.length - 8)}`;
                    }
                    return userId;
                  };
                  
                  // Get display name: prefer current user info (if match), then user info from API, then formatted userId
                  let displayName: string;
                  if (isCurrentUser && currentUser) {
                    // Always use current user's info if this is the current user
                    if (currentUser.fullName) {
                      displayName = currentUser.fullName;
                    } else if (currentUser.firstName || currentUser.lastName) {
                      displayName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();
                    } else if (currentUser.primaryEmailAddress?.emailAddress) {
                      displayName = currentUser.primaryEmailAddress.emailAddress;
                    } else {
                      displayName = formatUserId(member.userId);
                    }
                  } else if (member.user?.fullName) {
                    displayName = member.user.fullName;
                  } else if (member.user?.email) {
                    displayName = member.user.email;
                  } else {
                    displayName = formatUserId(member.userId);
                  }
                  
                  // Get email: prefer current user email (if match), then user info from API
                  const displayEmail = 
                    (isCurrentUser && currentUser?.primaryEmailAddress?.emailAddress) ||
                    member.user?.email ||
                    undefined;
                  
                  // Get avatar: prefer current user image (if match), then user info from API
                  const avatarUrl = 
                    (isCurrentUser && currentUser?.imageUrl) ||
                    member.user?.avatarUrl ||
                    undefined;
                  
                  const initials = displayName.charAt(0).toUpperCase();
                  
                  return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={displayName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                            {initials}
                        </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {displayName}
                            {member.userId === activeWorkspace.ownerId && (
                              <Badge variant="outline" className="ml-2">{t("components.WorkSpaceSettingDialog.owner")}</Badge>
                            )}
                          </div>
                          {displayEmail && displayEmail !== displayName && (
                            <div className="text-xs text-muted-foreground">
                              {displayEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.userId !== activeWorkspace.ownerId ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.id, value as "ADMIN" | "MEMBER")}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">{t("components.WorkSpaceSettingDialog.admin")}</SelectItem>
                            <SelectItem value="MEMBER">{t("components.WorkSpaceSettingDialog.member")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">
                          {member.role === "OWNER" ? t("components.WorkSpaceSettingDialog.owner") : 
                           member.role === "ADMIN" ? t("components.WorkSpaceSettingDialog.admin") : 
                           member.role === "MEMBER" ? t("components.WorkSpaceSettingDialog.member") : t("components.WorkSpaceSettingDialog.viewer")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    {
                      <TableCell className="text-right">
                        {member.userId !== activeWorkspace.ownerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    }
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Invite Members */}
          {
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("components.WorkSpaceSettingDialog.inviteMembers")}</h3>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t("components.WorkSpaceSettingDialog.emailAddress")}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleInvite();
                    }
                  }}
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "ADMIN" | "MEMBER")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">{t("components.WorkSpaceSettingDialog.member")}</SelectItem>
                    <SelectItem value="ADMIN">{t("components.WorkSpaceSettingDialog.admin")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("components.WorkSpaceSettingDialog.invite")}
                </Button>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t("components.WorkSpaceSettingDialog.pendingInvites")}</h4>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{invite.email}</span>
                          <Badge variant="outline">
                            {invite.role === "ADMIN" ? t("components.WorkSpaceSettingDialog.admin") : 
                             invite.role === "MEMBER" ? t("components.WorkSpaceSettingDialog.member") : t("components.WorkSpaceSettingDialog.viewer")}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("components.WorkSpaceSettingDialog.expires")} {new Date(invite.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}

