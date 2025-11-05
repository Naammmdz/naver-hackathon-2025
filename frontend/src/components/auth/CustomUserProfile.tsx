import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { toast } from "sonner";

interface CustomUserProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomUserProfile({ open, onOpenChange }: CustomUserProfileProps) {
  const { user } = useUser();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Convert the relative URL to absolute URL for Clerk
      const absoluteUrl = `${window.location.origin}${avatarUrl}`;
      
      await user.setProfileImage({ file: absoluteUrl });
      
      toast.success("Avatar updated successfully!");
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error("Failed to update avatar. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile</label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
                <AvatarFallback>
                  {(user.fullName || user.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAvatarPicker(true)}
                >
                  Choose Avatar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // You can implement custom upload here if needed
                    toast.info("Custom upload coming soon!");
                  }}
                >
                  Upload
                </Button>
                {user.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      try {
                        await user.setProfileImage({ file: null });
                        toast.success("Avatar removed");
                      } catch (error) {
                        toast.error("Failed to remove avatar");
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended size 1:1, up to 10MB
            </p>
          </div>

          {/* Avatar Picker Dialog */}
          {showAvatarPicker && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <AvatarPicker
                currentAvatar={user.imageUrl}
                onSelect={handleAvatarSelect}
                onCancel={() => setShowAvatarPicker(false)}
              />
            </div>
          )}

          {/* User Info Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Username</label>
              <p className="text-sm text-muted-foreground mt-1">
                {user.username || "Not set"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground mt-1">
                {user.primaryEmailAddress?.emailAddress || "Not set"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground mt-1">
                {user.fullName || "Not set"}
              </p>
            </div>
          </div>

          {/* Link to Full Clerk Profile */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="link"
              className="text-sm px-0"
              onClick={() => {
                // Open Clerk's full profile page
                window.open(user.profileImageUrl || "/user", "_blank");
              }}
            >
              Manage full profile settings →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
