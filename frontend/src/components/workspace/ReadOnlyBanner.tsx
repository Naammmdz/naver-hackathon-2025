import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { Eye, X } from "lucide-react";
import { useState } from "react";

export function ReadOnlyBanner() {
  const { isReadOnly, currentMemberRole } = useWorkspacePermission();
  const [dismissed, setDismissed] = useState(false);

  if (!isReadOnly || dismissed) return null;

  return (
    <Alert className="bg-orange-500/10 border-orange-500/20 text-orange-900 dark:text-orange-100 mb-4 relative">
      <Eye className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between pr-8">
        <div>
          <strong className="font-semibold">Chế độ chỉ xem</strong>
          <span className="ml-2">
            Bạn có quyền <strong>{currentMemberRole}</strong> trong workspace này. 
            Bạn không thể tạo hoặc chỉnh sửa nội dung.
          </span>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-orange-500/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
