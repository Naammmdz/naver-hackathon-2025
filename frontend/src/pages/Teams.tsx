import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { workspaceApi } from '@/lib/api/workspaceApi';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';
import { Crown, Mail, MoreHorizontal, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { WorkspaceMember, WorkspaceInvite } from '@/types/workspace';

export default function Teams({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void }) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const { inviteMember, removeMember, updateMemberRole } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserMember = members.find((m) => m.userId === currentUser?.id);
  // Helper function to get display name for a member
  const getMemberDisplayName = (member: WorkspaceMember) => {
    const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
    const isCurrentUserNormalized = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser.id);
    
    if (isCurrentUserNormalized) return "You";
    
    if (member.user?.fullName) return member.user.fullName;
    if (member.user?.email) return member.user.email;
    
    // Format userId for display
    if (member.userId.length > 20) {
      return `User ${member.userId.substring(member.userId.length - 8)}`;
    }
    return member.userId;
  };

  // Helper function to get display email for a member
  const getMemberDisplayEmail = (member: WorkspaceMember) => {
    const isCurrentUser = currentUser?.id && member.userId === currentUser.id;
    const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
    const isCurrentUserNormalized = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser.id);
    
    if (member.user?.email) return member.user.email;
    if (isCurrentUserNormalized && currentUser?.primaryEmailAddress?.emailAddress) {
      return currentUser.primaryEmailAddress.emailAddress;
    }
    return undefined;
  };

  // Helper function to get avatar URL for a member
  const getMemberAvatarUrl = (member: WorkspaceMember) => {
    const isCurrentUser = currentUser?.id && member.userId === currentUser.id;
    const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
    const isCurrentUserNormalized = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser.id);
    
    if (member.user?.avatarUrl) return member.user.avatarUrl;
    if (isCurrentUserNormalized && currentUser?.imageUrl) return currentUser.imageUrl;
    return undefined;
  };

  const filteredMembers = members.filter((member) => {
    const displayName = getMemberDisplayName(member).toLowerCase();
    const displayEmail = getMemberDisplayEmail(member)?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return displayName.includes(query) || displayEmail.includes(query);
  });

  const handleInvite = async () => {
    if (!activeWorkspaceId || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteMember(activeWorkspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setIsInviteDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Invite sent successfully',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invite',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeMember(activeWorkspaceId, memberId);
      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    if (!activeWorkspaceId) return;

    try {
      await updateMemberRole(activeWorkspaceId, memberId, newRole);
      toast({
        title: 'Success',
        description: `Member role updated to ${newRole}`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change role',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8 text-[hsl(var(--primary))]" />
              Team Members
            </h1>
            <p className="text-muted-foreground">
              Manage your workspace team members and permissions
            </p>
          </div>

          {isAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this workspace. They will receive an email with instructions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inviteEmail.trim()) {
                        handleInvite();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Workspace Info */}
        {activeWorkspace && (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workspace</p>
                <p className="text-lg font-semibold">{activeWorkspace.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-lg font-semibold">{members.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Team Members List */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">All Members ({filteredMembers.length})</h2>
          </div>
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No members found' : 'No team members yet'}
              </p>
              {!searchQuery && isAdmin && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
                {filteredMembers.map((member) => {
                  const displayName = getMemberDisplayName(member);
                  const displayEmail = getMemberDisplayEmail(member);
                  const avatarUrl = getMemberAvatarUrl(member);
                  const initials = displayName.charAt(0).toUpperCase();
                  const isCurrentUser = currentUser?.id && member.userId === currentUser.id;
                  const canManage = isAdmin && member.userId !== activeWorkspace?.ownerId;
                  
                  return (
                    <div
                      key={member.id}
                      className="p-4 hover:bg-accent/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={displayName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent-foreground))] flex items-center justify-center text-white font-semibold">
                              {initials}
                            </div>
                          )}
                          {(member.role === 'ADMIN' || member.role === 'OWNER') && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[hsl(var(--warning))] flex items-center justify-center border-2 border-background">
                              <Crown className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{displayName}</p>
                            {member.userId === activeWorkspace?.ownerId && (
                              <Badge variant="outline">Owner</Badge>
                            )}
                            {member.role === 'ADMIN' && member.userId !== activeWorkspace?.ownerId && (
                              <Badge variant="secondary" className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]">
                                Admin
                              </Badge>
                            )}
                            {member.role === 'MEMBER' && (
                              <Badge variant="secondary" className="bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]">
                                Member
                              </Badge>
                            )}
                          </div>
                          {displayEmail && (
                            <div className="flex items-center gap-2 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {canManage && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'MEMBER' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'ADMIN')}>
                                <Crown className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {member.role === 'ADMIN' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'MEMBER')}>
                                <Users className="h-4 w-4 mr-2" />
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              Remove from Workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
        </div>

        {/* Info Card */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[hsl(var(--primary))]/10 p-2">
              <Users className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">About Team Roles</p>
              <p className="text-sm text-muted-foreground">
                <strong>Admins</strong> can manage workspace settings, invite members, and remove members.{' '}
                <strong>Members</strong> can create and edit tasks, documents, and boards within the workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

