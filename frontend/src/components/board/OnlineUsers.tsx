import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const getDefaultAvatar = (id: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    id
  )}`;
};

interface OnlineUsersProps {
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const OnlineUsers = memo(function OnlineUsers({
  maxVisible = 3,
  size = "sm",
  showLabel = true,
  className,
}: OnlineUsersProps) {
  const { t } = useTranslation();
  const activeUsers = useOnlineUsers();
  const { userId } = useAuth();
  const [showAllUsers, setShowAllUsers] = useState(false);
  const allowHideRef = useRef(false);
  const hasSeenUsersRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeUsers.length > 0) {
      hasSeenUsersRef.current = true;
      allowHideRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    } else if (hasSeenUsersRef.current) {
      allowHideRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        allowHideRef.current = true;
        hideTimerRef.current = null;
      }, 1000);
    } else {
      allowHideRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        allowHideRef.current = true;
        hideTimerRef.current = null;
      }, 500);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [activeUsers.length]);

  const otherUsers = useMemo(
    () => activeUsers.filter((u) => u.id !== userId),
    [activeUsers, userId]
  );

  const visibleUsers = useMemo(
    () => otherUsers.slice(0, maxVisible),
    [otherUsers, maxVisible]
  );

  const hiddenUsers = useMemo(
    () => otherUsers.slice(maxVisible),
    [otherUsers, maxVisible]
  );

  const hasHiddenUsers = hiddenUsers.length > 0;

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const getUserInitial = (user: typeof activeUsers[0]) =>
    (user.name?.charAt(0) || user.email.charAt(0)).toUpperCase();

  const getDisplayName = (user: typeof activeUsers[0]) =>
    user.name ? user.name : user.email.split("@")[0];

  if (otherUsers.length === 0) {
    if (allowHideRef.current) return null;
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center -space-x-2.5">
          {visibleUsers.map((collaborator) => (
            <Tooltip key={collaborator.id}>
              <TooltipTrigger asChild>
                <div className="relative group">
                  <Avatar
                    className={cn(
                      sizeClasses[size],
                      "border-2 border-background transition-all hover:scale-110 hover:z-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/20"
                    )}
                  >
                    <AvatarImage
                      src={
                        collaborator.avatarUrl ||
                        getDefaultAvatar(collaborator.id)
                      }
                      alt={collaborator.name || collaborator.email}
                    />
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{
                        backgroundColor: collaborator.color,
                        color: "#ffffff",
                      }}
                    >
                      {getUserInitial(collaborator)}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                    style={{ backgroundColor: "#10b981" }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">
                    {getDisplayName(collaborator)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {t("onlineUsers.activeNow")}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {hasHiddenUsers && (
            <Popover open={showAllUsers} onOpenChange={setShowAllUsers}>
              <Tooltip>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        sizeClasses[size],
                        "relative flex items-center justify-center rounded-full border-2 border-background bg-muted text-foreground font-semibold hover:bg-muted/80 transition-all cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary/20"
                      )}
                    >
                      +{hiddenUsers.length}
                    </button>
                  </TooltipTrigger>
                </PopoverTrigger>

                <TooltipContent side="bottom" className="text-xs">
                  <p>
                    {t("onlineUsers.viewAll", {
                      count: otherUsers.length,
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>

              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>
                      {t("onlineUsers.activeUsers")} ({otherUsers.length})
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {otherUsers.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar
                          className="h-8 w-8 border-2"
                          style={{
                            borderColor: "hsl(var(--background))",
                          }}
                        >
                          <AvatarImage
                            src={
                              collaborator.avatarUrl ||
                              getDefaultAvatar(collaborator.id)
                            }
                            alt={collaborator.name || collaborator.email}
                          />
                          <AvatarFallback
                            className="text-xs font-semibold"
                            style={{
                              backgroundColor: collaborator.color,
                              color: "#ffffff",
                            }}
                          >
                            {getUserInitial(collaborator)}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                          style={{ backgroundColor: "#10b981" }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getDisplayName(collaborator)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {collaborator.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {showLabel && (
          <span className="text-xs text-muted-foreground hidden md:inline-block whitespace-nowrap">
            {t("onlineUsers.usersOnline", { count: otherUsers.length })}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
});
