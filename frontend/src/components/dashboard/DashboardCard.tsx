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
import { ReactNode, useRef, useState, useEffect, memo } from "react";

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
  width?: number; // Custom width in pixels
  height?: number; // Custom height in pixels
  x?: number; // X position in grid units
  y?: number; // Y position in grid units
}

interface DashboardCardProps {
  config: DashboardCardConfig;
  children: ReactNode;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  isDragging?: boolean;
}

export const DashboardCard = memo(function DashboardCard({ config, children, onRemove, onEdit, onResize, isDragging }: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: config.id });

  const cardRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0,
    direction: '' as 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | ''
  });

  // Calculate grid span based on custom width/height
  const getGridSpan = (size: number, baseSize: number, gap: number = 12) => {
    // baseSize is the default card size (280px for height, ~300px for width depending on grid)
    // gap is the gap between cards (12px = gap-3)
    return Math.max(1, Math.ceil((size + gap) / (baseSize + gap)));
  };

  const gridColumnSpan = config.width 
    ? getGridSpan(config.width, 300, 12) 
    : (config.size === 'large' ? 2 : 1);
  const gridRowSpan = config.height 
    ? getGridSpan(config.height, 280, 12) 
    : 1;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: (isResizing || isSortableDragging) ? 'none' : transition,
    ...(config.width && { width: `${config.width}px` }),
    ...(config.height && { height: `${config.height}px` }),
    gridColumn: `span ${gridColumnSpan}`,
    gridRow: `span ${gridRowSpan}`,
    // Only use explicit positioning if both x and y are set, otherwise let grid auto-place
    ...(config.x !== undefined && config.y !== undefined && {
      gridColumnStart: config.x + 1,
      gridRowStart: config.y + 1,
    }),
    ...(isSortableDragging && { 
      opacity: 0.4,
      zIndex: 0,
    }),
  };

  // Notion-style: All cards same size, no spanning
  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1",
    large: "col-span-1 sm:col-span-2",
    full: "col-span-full",
  };

  const handleResizeStart = (e: React.MouseEvent, direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardRef.current || !onResize) return;

    const rect = cardRef.current.getBoundingClientRect();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      direction,
    });
  };

  useEffect(() => {
    if (!isResizing || !onResize) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      
      const { direction } = resizeStart;
      
      // Handle resize based on direction
      if (direction.includes('e')) {
        newWidth = Math.max(200, resizeStart.width + deltaX);
      } else if (direction.includes('w')) {
        newWidth = Math.max(200, resizeStart.width - deltaX);
      }
      
      if (direction.includes('s')) {
        newHeight = Math.max(150, resizeStart.height + deltaY);
      } else if (direction.includes('n')) {
        newHeight = Math.max(150, resizeStart.height - deltaY);
      }
      
      onResize(config.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, config.id, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[config.size],
        "transition-all duration-200 relative",
        (isDragging || isSortableDragging) && "opacity-50 scale-95",
        isResizing && "select-none"
      )}
    >
      <Card 
        ref={cardRef}
        className={cn(
          "h-full hover:shadow-lg transition-all duration-200 flex flex-col group cursor-pointer relative",
          "bg-gradient-to-br from-background via-background to-secondary/10",
          "border border-border/60 hover:border-border",
          "border-l-2 hover:border-l-4",
          config.color || "border-l-primary",
          (isDragging || isSortableDragging) && "shadow-2xl ring-2 ring-primary/50",
          isResizing && "ring-2 ring-primary/50"
        )}
      >
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
        
        {/* Resize Handles - Disable when dragging */}
        {onResize && !isSortableDragging && (
          <>
            {/* Corner Handles */}
            {/* Top Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              className={cn(
                "absolute top-0 left-0 w-4 h-4 cursor-nwse-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (diagonal)"
            >
              <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 border-muted-foreground/40 group-hover:border-primary/60 transition-colors" />
            </div>
            
            {/* Top Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              className={cn(
                "absolute top-0 right-0 w-4 h-4 cursor-nesw-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (diagonal)"
            >
              <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 border-muted-foreground/40 group-hover:border-primary/60 transition-colors" />
            </div>
            
            {/* Bottom Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              className={cn(
                "absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (diagonal)"
            >
              <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 border-muted-foreground/40 group-hover:border-primary/60 transition-colors" />
            </div>
            
            {/* Bottom Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              className={cn(
                "absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (diagonal)"
            >
              <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/40 group-hover:border-primary/60 transition-colors" />
            </div>
            
            {/* Edge Handles */}
            {/* Top */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'n')}
              className={cn(
                "absolute top-0 left-4 right-4 h-2 cursor-ns-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (vertical)"
            />
            
            {/* Bottom */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 's')}
              className={cn(
                "absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (vertical)"
            />
            
            {/* Left */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'w')}
              className={cn(
                "absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (horizontal)"
            />
            
            {/* Right */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'e')}
              className={cn(
                "absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize",
                "bg-transparent hover:bg-primary/20 transition-colors z-10",
                "group-hover:bg-primary/10"
              )}
              title="Resize (horizontal)"
            />
          </>
        )}
      </Card>
    </div>
  );
});

