import { useUser } from "@clerk/clerk-react";
import { Crown, Shield } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";

interface MemberInfoProps {
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  email?: string;
  fullName?: string;
}

export function MemberInfo({ userId, role, email, fullName }: MemberInfoProps) {
  const { user } = useUser();
  const isCurrentUser = user?.id === userId;
  
  // For current user, use Clerk data
  // For other users, use data from backend or fallback
  const displayName = isCurrentUser && user 
    ? (user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "Unknown User")
    : (fullName || email?.split('@')[0] || userId.substring(0, 8) + "...");
    
  const displayEmail = isCurrentUser && user
    ? user.primaryEmailAddress?.emailAddress
    : email;

  return (
    <div className="flex items-center gap-3">
      <MemberAvatar 
        userId={userId} 
        fullName={fullName}
        email={email}
        size="md" 
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {displayName}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">You</span>
          )}
          {role === "owner" && (
            <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          )}
          {role === "admin" && (
            <Crown className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        {displayEmail && (
          <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>
        )}
      </div>
    </div>
  );
}
