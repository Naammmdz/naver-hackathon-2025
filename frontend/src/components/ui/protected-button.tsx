import { Button, ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/utils";

interface ProtectedButtonProps extends ButtonProps {
  requireEdit?: boolean;
  disabledTooltip?: string;
}

export function ProtectedButton({
  requireEdit = true,
  disabledTooltip = "Bạn không có quyền thực hiện hành động này",
  children,
  onClick,
  disabled,
  className,
  ...props
}: ProtectedButtonProps) {
  const { canEdit, showReadOnlyToast } = useWorkspacePermission();

  const isDisabled = disabled || (requireEdit && !canEdit);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (requireEdit && !canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showReadOnlyToast();
      return;
    }
    onClick?.(e);
  };

  if (requireEdit && !canEdit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                {...props}
                disabled={isDisabled}
                onClick={handleClick}
                className={cn("cursor-not-allowed opacity-50", className)}
              >
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Button>
  );
}
