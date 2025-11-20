import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/clerk-react';
import {
  CheckSquare,
  FileText,
  Home,
  Kanban,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClickupAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewChange?: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void;
  currentView?: 'tasks' | 'docs' | 'board' | 'home' | 'teams';
}

export function ClickupAppSidebar({ isOpen, onClose, onViewChange, currentView = 'home' }: ClickupAppSidebarProps) {
  const [activeNav, setActiveNav] = useState<'tasks' | 'docs' | 'board' | 'home' | 'teams'>(currentView || 'home');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update activeNav when currentView changes
  useEffect(() => {
    if (currentView) {
      setActiveNav(currentView);
    }
  }, [currentView]);

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', view: 'tasks' as const },
    { id: 'docs', icon: FileText, label: 'Docs', view: 'docs' as const },
    { id: 'board', icon: Kanban, label: 'Board', view: 'board' as const },
    { id: 'teams', icon: Users, label: 'Teams', view: 'teams' as const },
  ];

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + Website Name Button */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors border-b border-sidebar-border"
        onClick={() => window.location.href = '/app'}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 p-1 flex-shrink-0">
          <img
            src="/DevHolic-demo.png"
            alt="DevHolic"
            className="w-full h-full object-contain"
          />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-semibold text-foreground">DevHolic</span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveNav(item.id as any);
              if (item.view && onViewChange) {
                onViewChange(item.view);
              } else if (item.id === 'home') {
                window.location.href = '/';
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-all",
              "hover:bg-accent/50",
              activeNav === item.id && "bg-warning/15 border-l-4 border-l-warning text-accent-foreground font-medium"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0",
              activeNav === item.id ? "text-accent-foreground" : "text-muted-foreground"
            )} />
            {!isCollapsed && (
              <span className={cn(
                "text-sm",
                activeNav === item.id ? "text-accent-foreground font-medium" : "text-foreground"
              )}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Collapse Toggle - Inside sidebar at bottom */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {isCollapsed ? (
            <>
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
