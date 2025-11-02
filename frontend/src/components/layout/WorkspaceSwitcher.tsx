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
import { Check, ChevronDown, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => setActiveWorkspace(workspace.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.id === activeWorkspaceId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Workspace Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
