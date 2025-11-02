import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MemberInfo } from "@/components/workspace/MemberInfo";
import { useRealtimeWorkspaceMembers } from "@/hooks/use-realtime-workspace";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { WorkspaceMember } from "@/types/workspace";
import { useAuth } from "@clerk/clerk-react";
import { Crown, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function WorkspaceSettings() {
  const {
    activeWorkspaceId,
    getActiveWorkspace,
    members,
    loadMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    getCurrentMemberRole,
  } = useWorkspaceStore();
  
  const { broadcastMemberUpdate, isConnected } = useRealtimeWorkspaceMembers();

  const activeWorkspace = getActiveWorkspace();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const currentMemberRole = getCurrentMemberRole();
  const currentMember = useMemo(
    () => members.find((member) => member.userId === userId),
    [members, userId]
  );
  const canManageRoles = currentMember?.role === "owner";

  useEffect(() => {
    if (!canManageRoles && role === "admin") {
      setRole("member");
    }
  }, [canManageRoles, role]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadMembers(activeWorkspaceId);
    }
  }, [activeWorkspaceId, loadMembers]);

  // Protection: Only owners can access settings
  if (currentMemberRole !== "owner") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only workspace owners can access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !email.trim()) return;

    setIsInviting(true);
    try {
      console.log('[WorkspaceSettings] Inviting member:', {
        workspaceId: activeWorkspaceId,
        email: email.trim(),
        role
      });
      await inviteMember(activeWorkspaceId, email.trim(), role);
      console.log('[WorkspaceSettings] Invite sent successfully');
      setEmail("");
      setRole("member");
      // Broadcast to other users
      broadcastMemberUpdate();
    } catch (error) {
      console.error("Failed to invite member:", error);
      alert(`Failed to invite member: ${error}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!activeWorkspaceId || !memberToRemove) return;

    try {
      await removeMember(activeWorkspaceId, memberToRemove.id);
      setShowRemoveDialog(false);
      setMemberToRemove(null);
      // Broadcast to other users
      broadcastMemberUpdate();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    if (!activeWorkspaceId || !canManageRoles) return;

    try {
      await updateMemberRole(activeWorkspaceId, memberId, newRole);
      // Broadcast to other users
      broadcastMemberUpdate();
    } catch (error) {
      console.error("Failed to update member role:", error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "destructive";
      case "admin":
        return "default";
      case "member":
        return "default";
      case "viewer":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy workspace</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý thành viên và cài đặt cho workspace "{activeWorkspace.name}"
          </p>
        </div>

        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin Workspace</CardTitle>
            <CardDescription>
              Thông tin cơ bản về workspace của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Tên Workspace</Label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-sm font-semibold text-primary-foreground">
                  {activeWorkspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{activeWorkspace.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {members.length} {members.length === 1 ? "thành viên" : "thành viên"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Mời thành viên
            </CardTitle>
            <CardDescription>
              Nhập email để mời người khác vào workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isInviting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email của người dùng cần mời
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò</Label>
                  <Select
                    value={role}
                    onValueChange={(value: "admin" | "member" | "viewer") => setRole(value)}
                    disabled={isInviting}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" disabled={!canManageRoles}>
                        Admin - Quản trị { !canManageRoles && "(chỉ Owner)" }
                      </SelectItem>
                      <SelectItem value="member">Member - Chỉnh sửa</SelectItem>
                      <SelectItem value="viewer">Viewer - Chỉ xem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isInviting || !email.trim()}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isInviting ? "Đang thêm..." : "Thêm thành viên"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Thành viên ({members.length})
            </CardTitle>
            <CardDescription>
              Quản lý quyền truy cập của các thành viên trong workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Chưa có thành viên nào
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <MemberInfo
                          userId={member.userId}
                          role={member.role}
                          email={member.user?.email}
                          fullName={member.user?.fullName}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('vi-VN') : '-'}</TableCell>
                      <TableCell>
                        {canManageRoles && member.role !== "owner" ? (
                          <Select
                            value={member.role}
                            onValueChange={(value: "admin" | "member" | "viewer") =>
                              handleRoleChange(member.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                                {member.role === "owner" && <Shield className="h-3 w-3" />}
                                {member.role === "admin" && <Crown className="h-3 w-3" />}
                                <span>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                            {member.role === "owner" && <Shield className="h-3 w-3" />}
                            {member.role === "admin" && <Crown className="h-3 w-3" />}
                            <span>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setMemberToRemove(member);
                            setShowRemoveDialog(true);
                          }}
                          disabled={member.role === "owner" || member.userId === userId}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong className="font-mono">@{memberToRemove?.userId}</strong> khỏi workspace?
              Người này sẽ mất quyền truy cập vào tất cả dữ liệu trong workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa thành viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
