import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Check, ChevronDown, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { RenameWorkspaceDialog } from "./RenameWorkspaceDialog";

interface WorkspaceSwitcherProps {
  onNavigateToSettings?: () => void;
}

export function WorkspaceSwitcher({ onNavigateToSettings }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, deleteWorkspace, getCurrentMemberRole } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentMemberRole = getCurrentMemberRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [workspaceToRename, setWorkspaceToRename] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteClick = (workspaceId: string, workspaceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToDelete(workspaceId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (workspaceId: string, workspaceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToRename({ id: workspaceId, name: workspaceName });
    setRenameDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (workspaceToDelete) {
      await deleteWorkspace(workspaceToDelete);
      setWorkspaceToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2 px-3"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">
                {activeWorkspace?.name.charAt(0).toUpperCase() || "W"}
              </div>
              <span className="truncate font-medium">
                {activeWorkspace?.name || "Select Workspace"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="relative group">
              <DropdownMenuItem
                onClick={() => setActiveWorkspace(workspace.id)}
                className="flex items-center gap-2 cursor-pointer pr-16"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold group-hover:bg-primary/20 transition-colors">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspaceId && (
                  <Check className="h-4 w-4 text-foreground group-hover:text-background transition-colors" />
                )}
              </DropdownMenuItem>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 pointer-events-none group-hover:pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-foreground group-hover:text-background hover:bg-accent/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameClick(workspace.id, workspace.name, e);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-disabled={workspaces.length <= 1}
                  className="h-6 w-6 text-foreground group-hover:text-background hover:bg-accent/50 transition-colors aria-disabled:opacity-30 aria-disabled:cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (workspaces.length > 1) {
                      handleDeleteClick(workspace.id, workspace.name, e);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </DropdownMenuItem>
          {currentMemberRole === "owner" && (
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => onNavigateToSettings?.()}
            >
              <Settings className="mr-2 h-4 w-4" />
              Workspace Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />

      <RenameWorkspaceDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        workspaceId={workspaceToRename?.id ?? null}
        currentName={workspaceToRename?.name ?? ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa workspace này? Tất cả tasks, documents và boards trong workspace sẽ bị xóa vĩnh viễn.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
