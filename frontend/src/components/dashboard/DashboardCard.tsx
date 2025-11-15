import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, X, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface DashboardCardConfig {
  id: string;
  type: 'stat' | 'chart' | 'list' | 'quick-action' | 'custom';
  title: string;
  description?: string;
  icon?: ReactNode;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  order: number;
  color?: string;
}

interface DashboardCardProps {
  config: DashboardCardConfig;
  children: ReactNode;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  isDragging?: boolean;
}

export function DashboardCard({ config, children, onRemove, onEdit, isDragging }: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Notion-style: All cards same size, no spanning
  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1",
    large: "col-span-1 sm:col-span-2",
    full: "col-span-full",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[config.size],
        "transition-all duration-200",
        (isDragging || isSortableDragging) && "opacity-50 scale-95"
      )}
    >
      <Card className={cn(
        "h-full hover:shadow-lg transition-all duration-200 flex flex-col group cursor-pointer",
        "border-l-2 hover:border-l-4",
        config.color || "border-l-primary",
        (isDragging || isSortableDragging) && "shadow-2xl ring-2 ring-primary/50"
      )}>
        <CardHeader className="pb-2 px-4 pt-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Drag Handle - Always visible with icon */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded transition-all flex-shrink-0 hover:scale-110"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
              
              {config.icon && (
                <div className="flex-shrink-0 opacity-70">
                  {config.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold truncate">
                  {config.title}
                </CardTitle>
                {config.description && (
                  <CardDescription className="text-[11px] mt-0.5 truncate">
                    {config.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Remove button - Always visible with clear styling */}
              {onRemove && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
                  onClick={() => onRemove(config.id)}
                  title="Remove this card"
                  aria-label="Remove card"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              {/* Settings menu */}
              {onEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-all"
                      title="Card settings"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(config.id)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Customize
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

