import { useState, useEffect } from "react";
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
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeWorkspaceId, workspaces, updateWorkspace, loadMembers, inviteMember, removeMember, updateMemberRole } = useWorkspaceStore();
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isOwner = activeWorkspace?.ownerId === user?.id;
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
        title: "Error",
        description: "Failed to load workspace settings",
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
        title: "Success",
        description: `Workspace is now ${checked ? "public" : "private"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workspace",
        variant: "destructive",
      });
    }
  };

  const handleToggleAllowInvites = async (checked: boolean) => {
    if (!activeWorkspaceId) return;
    
    try {
      await updateWorkspace(activeWorkspaceId, { allowInvites: checked });
      toast({
        title: "Success",
        description: `Invites ${checked ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workspace",
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
        title: "Success",
        description: "Invite sent successfully",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    
    try {
      await removeMember(activeWorkspaceId, memberId);
      toast({
        title: "Success",
        description: "Member removed",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, role: "ADMIN" | "MEMBER") => {
    if (!activeWorkspaceId) return;
    
    try {
      await updateMemberRole(activeWorkspaceId, memberId, role);
      toast({
        title: "Success",
        description: "Member role updated",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  if (!activeWorkspace) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Manage your workspace settings and members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General Settings</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public Workspace</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to join this workspace
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
                <Label htmlFor="invites">Allow Invites</Label>
                <p className="text-sm text-muted-foreground">
                  Allow members to invite others
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
              <h3 className="text-lg font-semibold">Members</h3>
              {isOwner && (
                <Badge variant="secondary">{members.length} members</Badge>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {member.userId.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.userId}
                            {member.userId === activeWorkspace.ownerId && (
                              <Badge variant="outline" className="ml-2">Owner</Badge>
                            )}
                          </div>
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
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">
                          {member.role === "OWNER" ? "Owner" : 
                           member.role === "ADMIN" ? "Admin" : 
                           member.role === "MEMBER" ? "Member" : "Viewer"}
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Invite Members */}
          {
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Invite Members</h3>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
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
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Pending Invites</h4>
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
                            {invite.role === "ADMIN" ? "Admin" : 
                             invite.role === "MEMBER" ? "Member" : "Viewer"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
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

