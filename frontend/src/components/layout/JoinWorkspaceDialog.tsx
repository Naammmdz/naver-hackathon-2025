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
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Loader2, Search, Users } from "lucide-react";
import { useState } from "react";
import { workspaceApi } from "@/lib/api/workspaceApi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface JoinWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinWorkspaceDialog({ open, onOpenChange }: JoinWorkspaceDialogProps) {
  const { t } = useTranslation();
  const [workspaceId, setWorkspaceId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadWorkspaces } = useWorkspaceStore();

  const handleJoin = async () => {
    if (!workspaceId.trim()) {
      setError(t("workspace.workspaceIdRequired"));
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await workspaceApi.joinPublicWorkspace(workspaceId.trim());
      await loadWorkspaces();
      toast.success(t("workspace.successfullyJoinedWorkspace"));
      onOpenChange(false);
      setWorkspaceId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("workspace.failedToJoinWorkspace"));
      toast.error(t("workspace.failedToJoinWorkspace"));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("workspace.joinWorkspaceTitle")}</DialogTitle>
              <DialogDescription>
                {t("workspace.joinWorkspaceDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-id">{t("workspace.workspaceId")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="workspace-id"
                placeholder={t("workspace.workspaceIdPlaceholder")}
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleJoin} disabled={!workspaceId.trim() || isJoining}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("workspace.joining")}
                </>
              ) : (
                t("workspace.joinWorkspace")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
