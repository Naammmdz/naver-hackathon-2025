import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/clerk-react";

interface MemberAvatarProps {
  userId: string;
  fullName?: string;
  email?: string;
  size?: "sm" | "md" | "lg";
}

export function MemberAvatar({ userId, fullName, email, size = "md" }: MemberAvatarProps) {
  const { user } = useUser();
  
  // If this is the current user, use their data from Clerk
  const isCurrentUser = user?.id === userId;
  
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  // Generate fallback letter and color
  const getFallbackLetter = () => {
    if (isCurrentUser && user) {
      return (user.fullName || user.username || user.id).charAt(0).toUpperCase();
    }
    if (fullName) return fullName.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return userId.charAt(0).toUpperCase();
  };

  // Generate consistent color based on userId
  const getColorClass = () => {
    const colors = [
      "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      "bg-green-500/10 text-green-700 dark:text-green-400",
      "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      "bg-pink-500/10 text-pink-700 dark:text-pink-400",
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (isCurrentUser && user) {
    return (
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.imageUrl} alt={user.fullName || user.username || ""} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getFallbackLetter()}
        </AvatarFallback>
      </Avatar>
    );
  }

  // For other users, show colorful fallback
  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback className={`${getColorClass()} font-medium`}>
        {getFallbackLetter()}
      </AvatarFallback>
    </Avatar>
  );
}
