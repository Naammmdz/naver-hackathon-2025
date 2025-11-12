import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWidgetStore, WidgetType } from '@/store/widgetStore';
import { CheckSquare, FileText, Kanban, Calendar, Activity, Eye, EyeOff } from 'lucide-react';

interface WidgetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIDGET_INFO: Record<WidgetType, { label: string; icon: any; description: string }> = {
  tasks: {
    label: 'My Tasks',
    icon: CheckSquare,
    description: 'View and manage your tasks',
  },
  docs: {
    label: 'My Docs',
    icon: FileText,
    description: 'Quick access to your documents',
  },
  board: {
    label: 'My Boards',
    icon: Kanban,
    description: 'Overview of your boards',
  },
  calendar: {
    label: 'Calendar',
    icon: Calendar,
    description: 'View your schedule',
  },
  'recent-activity': {
    label: 'Recent Activity',
    icon: Activity,
    description: 'Track recent changes',
  },
};

export function WidgetConfigDialog({ open, onOpenChange }: WidgetConfigDialogProps) {
  const { widgets, toggleWidgetVisibility, resetToDefault } = useWidgetStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Your Home</DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your homepage. Drag and drop widgets to reorder them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Widget List */}
          <div className="space-y-2">
            {widgets.map((widget) => {
              const info = WIDGET_INFO[widget.type];
              const Icon = info.icon;

              return (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                    widget.visible
                      ? 'border-border/60 bg-card'
                      : 'border-border/30 bg-muted/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        widget.type === 'tasks'
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                          : widget.type === 'docs'
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                          : widget.type === 'board'
                          ? 'bg-gradient-to-br from-pink-500 to-pink-600'
                          : widget.type === 'calendar'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                          : 'bg-gradient-to-br from-green-500 to-green-600'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{info.label}</h4>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>

                  <Button
                    variant={widget.visible ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className="gap-2"
                  >
                    {widget.visible ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hidden
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-between border-t pt-4">
            <Button variant="ghost" onClick={resetToDefault}>
              Reset to Default
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
