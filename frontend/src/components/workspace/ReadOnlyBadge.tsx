import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { Eye } from "lucide-react";

export function ReadOnlyBadge() {
  const { isReadOnly, currentMemberRole } = useWorkspacePermission();

  if (!isReadOnly) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5 bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400">
            <Eye className="h-3 w-3" />
            Chỉ xem
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Bạn có quyền <strong>{currentMemberRole}</strong> trong workspace này.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Liên hệ admin để được cấp quyền chỉnh sửa.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
