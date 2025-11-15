import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";

// Simple fallback avatar URL generator
const getDefaultAvatar = (id: string) => {
  // Use a simple avatar service or return empty string to use fallback
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(id)}`;
};

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
  const activeUsers = useOnlineUsers();
  const { userId } = useAuth();
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Filter out current user
  const otherUsers = useMemo(() => {
    return activeUsers.filter(u => u.id !== userId);
  }, [activeUsers, userId]);
  const visibleUsers = useMemo(() => otherUsers.slice(0, maxVisible), [otherUsers, maxVisible]);
  const hiddenUsers = useMemo(() => otherUsers.slice(maxVisible), [otherUsers, maxVisible]);
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
