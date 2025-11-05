import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollaboration } from "@/contexts/CollaborationContext";
import { cn } from "@/lib/utils";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspaceStore } from "@/store/workspaceStore";

interface OnlineUsersProps {
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function OnlineUsers({ 
  maxVisible = 3, 
  size = "sm",
  showLabel = true,
  className 
}: OnlineUsersProps) {
  const { activeUsers } = useCollaboration();
  const { userId } = useAuth();
  const { user } = useUser();
  const members = useWorkspaceStore((s) => s.members);
  const [showAllUsers, setShowAllUsers] = useState(false);
  
  // Palette + deterministic color helper (fallback when using members list)
  const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
  ];
  const getColor = (id: string) => USER_COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % USER_COLORS.length];

  // Build display list: prefer live activeUsers; fallback to workspace members
  const displayUsers = useMemo(() => {
    if (activeUsers.length > 0) return activeUsers;
    return members
      .filter(m => m.userId)
      .map(m => ({
        id: m.userId,
        email: m.user?.email || `${m.userId}@example.com`,
        name: m.user?.fullName,
        avatarUrl: m.user?.avatarUrl,
        color: getColor(m.userId),
      }));
  }, [activeUsers, members]);

  // Filter out current user
  const otherUsers = displayUsers.filter(u => u.id !== userId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenUsers = otherUsers.slice(maxVisible);
  const hasHiddenUsers = hiddenUsers.length > 0;
  
  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };
  
  const getUserInitial = (user: typeof activeUsers[0]) => {
    return (user.name?.charAt(0) || user.email.charAt(0)).toUpperCase();
  };

  const getDisplayName = (user: typeof activeUsers[0]) => {
    if (user.name) return user.name;
    // Extract username from email (part before @)
    return user.email.split('@')[0];
  };

  // If no users are online, don't render anything
  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Avatar Stack */}
        <div className="flex items-center -space-x-2">
          {visibleUsers.map((collaborator) => (
            <Tooltip key={collaborator.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      sizeClasses[size],
                      "border-2 border-background transition-all hover:scale-110 hover:z-10 cursor-pointer"
                    )}
                    style={{ borderColor: collaborator.color }}
                  >
                    <AvatarImage 
                      src={collaborator.avatarUrl || getDefaultAvatar(collaborator.id)} 
                      alt={collaborator.name || collaborator.email} 
                    />
                    <AvatarFallback
                      className="text-xs font-medium"
                      style={{ 
                        backgroundColor: collaborator.color + '20', 
                        color: collaborator.color 
                      }}
                    >
                      {getUserInitial(collaborator)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator dot */}
                  <div
                    className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ring-1 ring-background"
                    style={{ backgroundColor: collaborator.color }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <p className="font-medium">{getDisplayName(collaborator)}</p>
                  <p className="text-muted-foreground">Editing now</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow indicator with popover */}
          {hasHiddenUsers && (
            <Popover open={showAllUsers} onOpenChange={setShowAllUsers}>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        sizeClasses[size],
                        "relative flex items-center justify-center rounded-full border-2 border-background",
                        "bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors cursor-pointer hover:scale-110"
                      )}
                    >
                      +{hiddenUsers.length}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">View all online users</p>
                  </TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Users className="h-4 w-4" />
                    <span>Online Users ({otherUsers.length})</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {otherUsers.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50">
                        <Avatar className="h-6 w-6" style={{ borderColor: collaborator.color, borderWidth: '2px' }}>
                          <AvatarImage 
                            src={collaborator.avatarUrl || getDefaultAvatar(collaborator.id)} 
                            alt={collaborator.name || collaborator.email} 
                          />
                          <AvatarFallback
                            className="text-xs font-medium"
                            style={{ 
                              backgroundColor: collaborator.color + '20', 
                              color: collaborator.color 
                            }}
                          >
                            {getUserInitial(collaborator)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getDisplayName(collaborator)}
                          </p>
                        </div>
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: collaborator.color }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        {/* Label (hidden on small screens if needed) */}
        {showLabel && (
          <span className="text-xs text-muted-foreground hidden md:inline-block whitespace-nowrap">
            {otherUsers.length} {otherUsers.length === 1 ? "user" : "users"} online
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
