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
import { useUser } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';
import { Crown, Mail, MoreHorizontal, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceMember, WorkspaceInvite } from '@/types/workspace';
import { getAvatarColor, getInitials } from '@/utils/avatarColors';

export default function Teams({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void }) {
  const { t } = useTranslation();
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
  const isOwner = activeWorkspace?.ownerId === currentUser?.id;
  const isAdmin = currentUserMember?.role === 'ADMIN' || isOwner;

  useEffect(() => {
    if (activeWorkspaceId) {
      loadData();
    }
  }, [activeWorkspaceId]);

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
      console.error('Failed to load workspace data:', error);
      toast({
        title: t('teams.error'),
        description: t('teams.failedToLoadMembers'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Helper function to get display name for a member
  const getMemberDisplayName = (member: WorkspaceMember) => {
    const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
    const isCurrentUser = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser?.id);
    
    if (member.fullName) return member.fullName;
    if (member.user?.fullName) return member.user.fullName;

    if (isCurrentUser && currentUser) {
      if (currentUser.fullName) return currentUser.fullName;
      if (currentUser.firstName || currentUser.lastName) {
        return [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim();
      }
    }

    if (member.user?.email) return member.user.email;
    if (isCurrentUser && currentUser?.primaryEmailAddress?.emailAddress) {
        return currentUser.primaryEmailAddress.emailAddress;
      }

    // Format userId for display
    if (member.userId.length > 20) {
      return `${t('teams.user')} ${member.userId.substring(member.userId.length - 8)}`;
    }
    return member.userId;
  };

  // Helper function to get display email for a member
  const getMemberDisplayEmail = (member: WorkspaceMember) => {
    const normalizeId = (id: string | undefined) => id?.trim().toLowerCase();
    const isCurrentUser = currentUser?.id && normalizeId(member.userId) === normalizeId(currentUser?.id);
    
    if (member.user?.email) return member.user.email;
    if (isCurrentUser && currentUser?.primaryEmailAddress?.emailAddress) {
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
        title: t('teams.success'),
        description: t('teams.inviteSentSuccessfully'),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t('teams.error'),
        description: error.message || t('teams.failedToSendInvite'),
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm(t('teams.confirmRemoveMember'))) return;

    try {
      await removeMember(activeWorkspaceId, memberId);
      toast({
        title: t('teams.success'),
        description: t('teams.memberRemovedSuccessfully'),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t('teams.error'),
        description: error.message || t('teams.failedToRemoveMember'),
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    if (!activeWorkspaceId) return;

    try {
      await updateMemberRole(activeWorkspaceId, memberId, newRole);
      toast({
        title: t('teams.success'),
        description: t('teams.memberRoleUpdated', { role: newRole }),
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t('teams.error'),
        description: error.message || t('teams.failedToChangeRole'),
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
              <Users className="h-8 w-8 text-blue-500" />
              {t('teams.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('teams.description')}
            </p>
          </div>

          {isAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('teams.inviteMember')}
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('teams.inviteDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('teams.inviteDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t('teams.emailAddress')}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('teams.emailPlaceholder')}
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
                    {t('teams.role')}
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="MEMBER">{t('teams.roleMember')}</option>
                    <option value="ADMIN">{t('teams.roleAdmin')}</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={isInviting}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
                  {isInviting ? t('teams.sending') : t('teams.sendInvitation')}
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
                <p className="text-sm font-medium text-muted-foreground">{t('teams.workspace')}</p>
                <p className="text-lg font-semibold">{activeWorkspace.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">{t('teams.totalMembers')}</p>
                <p className="text-lg font-semibold">{members.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('teams.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Team Members List */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">{t('teams.allMembers')} ({filteredMembers.length})</h2>
          </div>
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">{t('teams.loadingMembers')}</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery ? t('teams.noMembersFound') : t('teams.noTeamMembersYet')}
              </p>
              {!searchQuery && isAdmin && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('teams.inviteFirstMember')}
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
                            <div className={`h-10 w-10 rounded-full ${getAvatarColor(member.userId).bg} flex items-center justify-center ${getAvatarColor(member.userId).text} font-semibold`}>
                              {getInitials(member.user?.fullName, member.userId)}
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
                              <Badge variant="outline">{t('teams.owner')}</Badge>
                            )}
                            {member.role === 'ADMIN' && member.userId !== activeWorkspace?.ownerId && (
                              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                {t('teams.admin')}
                              </Badge>
                            )}
                            {member.role === 'MEMBER' && (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {t('teams.member')}
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
                            {t('teams.joined')} {new Date(member.joinedAt).toLocaleDateString()}
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
                                {t('teams.makeAdmin')}
                              </DropdownMenuItem>
                            )}
                            {member.role === 'ADMIN' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'MEMBER')}>
                                <Users className="h-4 w-4 mr-2" />
                                {t('teams.makeMember')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              {t('teams.removeFromWorkspace')}
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
            <div className="rounded-full bg-blue-500/10 p-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{t('teams.aboutTeamRoles')}</p>
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('teams.aboutTeamRolesDescription') }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

