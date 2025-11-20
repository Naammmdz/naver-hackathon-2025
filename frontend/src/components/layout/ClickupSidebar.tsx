import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import {
  CheckSquare,
  ChevronDown,
  CircleCheck,
  Clock,
  FileText,
  Home,
  Plus,
  Search,
  Settings,
  X
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface ClickupSidebarProps {
  currentView: 'tasks' | 'docs';
  onViewChange: (view: 'tasks' | 'docs') => void;
  isOpen: boolean;
  onClose: () => void;
}

const sidebarSurfaceStyle: CSSProperties = {
  background: 'linear-gradient(180deg, color-mix(in oklch, var(--sidebar) 98%, transparent) 0%, color-mix(in oklch, var(--sidebar) 88%, transparent) 100%)',
  borderColor: 'color-mix(in oklch, var(--sidebar-border) 80%, transparent)',
  boxShadow: '0 20px 45px color-mix(in oklch, var(--shadow-color) 12%, transparent)',
};

export function ClickupSidebar({
  currentView,
  onViewChange,
  isOpen,
  onClose,
}: ClickupSidebarProps) {
  const { tasks } = useTaskStore();
  const { t } = useTranslation();
  const [expandedLists, setExpandedLists] = useState<string[]>(['favorites']);

  const toggleList = (id: string) => {
    setExpandedLists(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Done').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    today: tasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date();
      const taskDate = new Date(t.dueDate);
      return taskDate.toDateString() === today.toDateString();
    }).length,
  };

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      count: undefined,
    },
    {
      id: 'my-tasks',
      label: 'My Tasks',
      icon: CheckSquare,
      count: stats.total,
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      icon: Clock,
      count: stats.inProgress,
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CircleCheck,
      count: stats.completed,
    },
  ];

  return (
    <aside
      className={cn(
        'w-64 border bg-sidebar/90 text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out rounded-3xl shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:shadow-[0_28px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl border-sidebar-border/50',
        !isOpen && 'lg:hidden absolute lg:relative left-0 top-0 h-screen z-40'
      )}
      style={sidebarSurfaceStyle}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sidebar-foreground/70">WORKSPACE</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Create New Button */}
        <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">New Project</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-sidebar-foreground/60" />
          <Input
            placeholder="Search..."
            className="pl-9 h-8 text-xs bg-sidebar/40 border border-transparent focus-visible:ring-sidebar-ring/30"
          />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Favorites Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleList('favorites')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar/60 rounded transition-colors"
          >
            <span>FAVORITES</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expandedLists.includes('favorites') && 'rotate-180'
              )}
            />
          </button>

          {expandedLists.includes('favorites') && (
            <div className="pl-2 space-y-1">
              {sidebarItems.slice(0, 2).map(item => (
                <Button
                  key={item.id}
                  variant={currentView === 'tasks' ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-3 text-sm h-9 text-foreground hover:bg-muted group relative overflow-hidden"
                  onClick={() => onViewChange('tasks')}
                >
                  {currentView === 'tasks' && item.id === 'my-tasks' && (
                    <div className="absolute inset-0 bg-primary/10 opacity-50" />
                  )}
                  <item.icon className="h-4 w-4 flex-shrink-0 relative z-10" />
                  <span className="flex-1 text-left relative z-10">{item.label}</span>
                  {item.count !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded relative z-10",
                      item.id === 'my-tasks' && item.count > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      {item.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-2" />

        {/* Lists Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleList('lists')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar/60 rounded transition-colors"
          >
            <span>LISTS</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expandedLists.includes('lists') && 'rotate-180'
              )}
            />
          </button>

          {expandedLists.includes('lists') && (
            <div className="pl-2 space-y-1">
              {sidebarItems.slice(2).map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sm h-9 text-foreground hover:bg-muted group"
                  onClick={() => onViewChange('tasks')}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded transition-all",
                      item.id === 'in-progress' && item.count > 0
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : item.id === 'completed' && item.count > 0
                        ? "bg-success text-success-foreground"
                        : "bg-muted"
                    )}>
                      {item.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-2" />

        {/* Views Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleList('views')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar/60 rounded transition-colors"
          >
            <span>VIEWS</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expandedLists.includes('views') && 'rotate-180'
              )}
            />
          </button>

          {expandedLists.includes('views') && (
            <div className="pl-2 space-y-1">
              <Button
                variant={currentView === 'tasks' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 text-sm h-9 text-foreground hover:bg-muted relative overflow-hidden group"
                onClick={() => onViewChange('tasks')}
              >
                {currentView === 'tasks' && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}
                <CheckSquare className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Task Board</span>
              </Button>

              <Button
                variant={currentView === 'docs' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 text-sm h-9 text-foreground hover:bg-muted relative overflow-hidden group"
                onClick={() => onViewChange('docs')}
              >
                {currentView === 'docs' && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Documents</span>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm h-9 text-foreground hover:bg-muted"
          size="sm"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
        <p className="text-xs text-sidebar-foreground/70 text-center py-2 px-2">
          DevHolic © 2025
        </p>
      </div>
    </aside>
  );
}
