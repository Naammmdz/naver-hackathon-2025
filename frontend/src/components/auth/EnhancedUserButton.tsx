import { UserButton } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { toast } from "sonner";
import { User } from "lucide-react";

/**
 * Component for the custom avatar picker page inside Clerk's profile
 */
function AvatarPickerPage() {
  const { user } = useUser();

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!user) return;

    try {
      // Fetch the image and convert to blob
      const absoluteUrl = `${window.location.origin}${avatarUrl}`;
      const response = await fetch(absoluteUrl);
      const blob = await response.blob();
      
      // Convert blob to File object
      const file = new File([blob], 'avatar.png', { type: blob.type });
      
      // Upload to Clerk
      await user.setProfileImage({ file });
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error("Failed to update avatar. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Choose Your Avatar</h2>
        <p className="text-sm text-muted-foreground">
          Select from our default avatars or upload your own in the Profile section.
        </p>
      </div>
      <AvatarPicker
        currentAvatar={user?.imageUrl}
        onSelect={handleAvatarSelect}
      />
    </div>
  );
}

/**
 * Enhanced UserButton that adds a custom "Choose Avatar" page
 * This keeps Clerk's original profile and adds avatar selection as a new page
 */
export function EnhancedUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8 rounded-lg",
        },
      }}
    >
      <UserButton.UserProfilePage
        label="Choose Avatar"
        labelIcon={<User className="h-4 w-4" />}
        url="choose-avatar"
      >
        <AvatarPickerPage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
