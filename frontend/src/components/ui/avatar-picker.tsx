import { useState } from "react";
import { DEFAULT_AVATARS } from "@/lib/defaultAvatars";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "./button";

interface AvatarPickerProps {
  currentAvatar?: string;
  onSelect: (avatarUrl: string) => void;
  onCancel?: () => void;
}

export function AvatarPicker({ currentAvatar, onSelect, onCancel }: AvatarPickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || "");

  const handleSelect = () => {
    if (selectedAvatar) {
      onSelect(selectedAvatar);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-3">Choose a default avatar</h3>
        <div className="grid grid-cols-5 gap-3">
          {DEFAULT_AVATARS.map((avatarUrl) => (
            <button
              key={avatarUrl}
              type="button"
              onClick={() => setSelectedAvatar(avatarUrl)}
              className={cn(
                "relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105",
                selectedAvatar === avatarUrl
                  ? "border-primary shadow-lg"
                  : "border-muted hover:border-muted-foreground/50"
              )}
            >
              <img
                src={avatarUrl}
                alt="Avatar option"
                className="w-full h-full object-cover"
              />
              {selectedAvatar === avatarUrl && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSelect} disabled={!selectedAvatar}>
          Select Avatar
        </Button>
      </div>
    </div>
  );
}
