import { LayoutGrid, List, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type ViewType = "board" | "list" | "calendar" | "analytics";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

export function ViewSwitcher({ currentView, onViewChange, className }: ViewSwitcherProps) {
  const { t } = useTranslation();
  
  const views = [
    { id: "board" as ViewType, label: t('views.board'), icon: LayoutGrid },
    { id: "list" as ViewType, label: t('views.list'), icon: List },
    { id: "calendar" as ViewType, label: t('views.calendar'), icon: Calendar },
    { id: "analytics" as ViewType, label: t('views.analytics'), icon: BarChart3 },
  ];

  return (
    <div className={cn("flex border rounded-lg p-1 bg-muted/50", className)}>
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <Button
            key={view.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center gap-1 h-7 hover-surface",
              isActive ? "shadow-sm bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
