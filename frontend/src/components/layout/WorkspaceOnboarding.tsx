import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Loader2, Rocket } from "lucide-react";
import { useState } from "react";

interface WorkspaceOnboardingProps {
  open: boolean;
  onWorkspaceCreated?: () => void | Promise<void>;
}

export function WorkspaceOnboarding({ open, onWorkspaceCreated }: WorkspaceOnboardingProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        settings: {
          isPublic: false,
          allowInvites: true,
        },
      });
      
      // Reset form
      setName("");
      setDescription("");
      
      // Notify parent that workspace was created
      if (onWorkspaceCreated) {
        await onWorkspaceCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome! 🎉</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Let's create your first workspace to get started
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-base font-medium">
              Workspace Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workspace-name"
              placeholder="e.g., My Team, Personal Projects"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreating}
              className="text-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-description" className="text-base font-medium">
              Description <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Textarea
              id="workspace-description"
              placeholder="What's this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
              className="resize-none text-base"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="w-full h-11 text-base font-medium"
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating workspace...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Create Workspace & Continue
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can create more workspaces later and switch between them anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
