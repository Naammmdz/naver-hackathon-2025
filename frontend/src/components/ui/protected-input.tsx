import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/utils";
import React from "react";

interface ProtectedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  requireEdit?: boolean;
  disabledTooltip?: string;
}

export function ProtectedInput({
  requireEdit = true,
  disabledTooltip = "Bạn không có quyền chỉnh sửa",
  disabled,
  className,
  ...props
}: ProtectedInputProps) {
  const { canEdit, showReadOnlyToast } = useWorkspacePermission();

  const isDisabled = disabled || (requireEdit && !canEdit);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (requireEdit && !canEdit) {
      e.preventDefault();
      e.currentTarget.blur();
      showReadOnlyToast();
    }
    props.onFocus?.(e);
  };

  if (requireEdit && !canEdit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              {...props}
              disabled={isDisabled}
              onFocus={handleFocus}
              className={cn("cursor-not-allowed", className)}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Input
      {...props}
      disabled={isDisabled}
      className={className}
    />
  );
}
