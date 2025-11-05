import { UserButton, useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { CustomUserProfile } from "./CustomUserProfile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Option 1: Use this as a replacement for UserButton
 * This gives you full control over the profile dialog
 */
export function CustomUserProfileButton() {
  const { user } = useUser();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg"
        onClick={() => setIsProfileOpen(true)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
          <AvatarFallback>
            {(user.fullName || user.username || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Button>

      <CustomUserProfile open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
}

/**
 * Option 2: Enhanced UserButton with custom profile page
 * This keeps Clerk's UserButton but adds custom profile functionality
 */
export function EnhancedUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8 rounded-lg",
        },
      }}
      afterSignOutUrl="/"
    >
      {/* You can add custom menu items here if needed */}
      <UserButton.MenuItems>
        <UserButton.Action label="Choose avatar" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
