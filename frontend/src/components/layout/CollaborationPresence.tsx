import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollaboration } from "@/contexts/CollaborationContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { Wifi, WifiOff } from "lucide-react";

export function CollaborationPresence() {
  const { activeUsers, isConnected, isReconnecting } = useCollaboration();
  const { userId } = useAuth();
  
  const otherUsers = activeUsers.filter(u => u.id !== userId);
  
  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className={cn(
                "h-3.5 w-3.5",
                isReconnecting ? "text-yellow-500 animate-pulse" : "text-red-500"
              )} />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isConnected ? "Đã kết nối" : isReconnecting ? "Đang kết nối lại..." : "Mất kết nối"}
        </TooltipContent>
      </Tooltip>
      
      {/* Active users */}
      {otherUsers.length > 0 && (
        <div className="flex items-center -space-x-2">
          {otherUsers.slice(0, 3).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      "h-7 w-7 border-2 border-background transition-all",
                      "hover:scale-110 hover:z-10"
                    )}
                    style={{ borderColor: user.color }}
                  >
                    <AvatarFallback
                      className="text-xs font-medium"
                      style={{ backgroundColor: user.color + '20', color: user.color }}
                    >
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Active indicator */}
                  <div
                    className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background"
                    style={{ backgroundColor: user.color }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">Đang chỉnh sửa</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow indicator */}
          {otherUsers.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{otherUsers.length - 3}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {otherUsers.slice(3).map(user => (
                    <p key={user.id} className="text-xs">
                      {user.name || user.email}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      
      {otherUsers.length > 0 && (
        <span className="text-xs text-muted-foreground hidden sm:block">
          {otherUsers.length} {otherUsers.length === 1 ? "người" : "người"} đang online
        </span>
      )}
    </div>
  );
}
