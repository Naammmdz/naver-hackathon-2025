import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { ReactNode } from 'react';

interface SidebarItemProps {
    title: string;
    isActive: boolean;
    isExpanded: boolean;
    level: number;
    onToggleExpand: (e: React.MouseEvent) => void;
    onClick: () => void;
    actions?: ReactNode;
    isEditing?: boolean;
    editingValue?: string;
    onEditChange?: (value: string) => void;
    onEditSubmit?: () => void;
    onEditCancel?: () => void;
    icon?: ReactNode;
}

export function SidebarItem({
    title,
    isActive,
    isExpanded,
    level,
    onToggleExpand,
    onClick,
    actions,
    isEditing,
    editingValue,
    onEditChange,
    onEditSubmit,
    onEditCancel,
    icon,
}: SidebarItemProps) {
    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all min-w-0 w-full max-w-full",
                isActive
                    ? "bg-primary/10 text-sidebar-foreground ring-1 ring-primary/20 dark:bg-muted/40 dark:text-sidebar-foreground dark:ring-sidebar-border/40 hover-surface font-medium"
                    : "hover-surface text-sidebar-foreground/80"
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onClick={onClick}
        >
            <span
                className="flex-shrink-0 text-sidebar-foreground/60 transition-transform cursor-pointer hover:text-sidebar-foreground"
                onClick={onToggleExpand}
            >
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                ) : (
                    <ChevronRight className="h-3 w-3" />
                )}
            </span>

            {icon && <span className="flex-shrink-0">{icon}</span>}

            <div className="flex-1 min-w-0 overflow-hidden">
                {isEditing ? (
                    <Input
                        value={editingValue}
                        onChange={(e) => onEditChange?.(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onEditSubmit?.();
                            } else if (e.key === 'Escape') {
                                onEditCancel?.();
                            }
                        }}
                        onBlur={onEditSubmit}
                        autoFocus
                        className="h-7 w-full"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="text-sm w-full truncate"
                        title={title}
                    >
                        {title.length > 15 ? `${title.slice(0, 15)}...` : title}
                    </div>
                )}
            </div>

            {actions && (
                <div className="flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {actions}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}
