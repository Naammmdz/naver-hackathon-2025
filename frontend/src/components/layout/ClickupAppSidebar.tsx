import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/clerk-react';
import {
  CheckSquare,
  FileText,
  Home,
  Kanban,
  Network,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClickupAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewChange?: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph') => void;
  currentView?: 'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph';
}

export function ClickupAppSidebar({ isOpen, onClose, onViewChange, currentView = 'home' }: ClickupAppSidebarProps) {
  const [activeNav, setActiveNav] = useState<'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph'>(currentView || 'home');
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>(['workspace-1']);

  // Update activeNav when currentView changes
  useEffect(() => {
    if (currentView) {
      setActiveNav(currentView);
    }
  }, [currentView]);

  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', gradient: 'from-primary to-primary/80' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', view: 'tasks' as const, gradient: 'from-primary to-accent' },
    { id: 'docs', icon: FileText, label: 'Docs', view: 'docs' as const, gradient: 'from-accent to-accent-foreground' },
    { id: 'board', icon: Kanban, label: 'Board', view: 'board' as const, gradient: 'from-primary/80 to-accent' },
    { id: 'graph', icon: Network, label: 'Graph', view: 'graph' as const, gradient: 'from-primary to-secondary' },
    { id: 'teams', icon: Users, label: 'Teams', view: 'teams' as const, gradient: 'from-success to-success/80' },
  ];

  const spaces = [
    {
      id: 'workspace-1',
      name: "Giang Nam's Workspace",
      lists: [
        { id: 'assigned', name: 'Assigned Comments', icon: 'comment' },
        { id: 'tasks', name: 'My Tasks', icon: 'check', view: 'tasks' as const },
        { id: 'docs', name: 'My Docs', icon: 'file', view: 'docs' as const },
      ],
    },
  ];

  const projects = [
    { id: 'it', name: 'IT' },
    { id: 'pm', name: 'Project management', count: 4 },
    { id: 'doc', name: 'IT Doc' },
  ];
  const gradientClass = 'bg-primary';
  const monochromeGradientClass = 'bg-gradient-to-br from-foreground/90 via-foreground/70 to-foreground/50';

  return (
    <div className="flex h-full bg-background shrink-0">
      {/* Icon Sidebar (Left) - Like ClickUp */}
      <div className="w-16 rounded-lg flex flex-col items-center py-3 gap-2 h-full overflow-y-auto shrink-0 ml-1 bg-sidebar text-sidebar-foreground border border-sidebar-border/60 shadow-sm">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-80 transition-all cursor-pointer bg-sidebar-accent/10 hover:bg-sidebar-accent/20 p-1.5" onClick={() => window.location.href = '/'}>
          <img
            src="/devflow-demo.png"
            alt="DevFlow Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="h-px w-6 bg-sidebar-foreground/20 my-1" />

        {navItems.map(item => (
          <div key={item.id} className="flex flex-col items-center gap-0.5 relative group">
            <div className="relative">
              {/* Background gradient - always visible with item color */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-xl transition-all duration-300 z-0 bg-gradient-to-br',
                  item.gradient,
                  activeNav === item.id 
                    ? 'opacity-100 dark:opacity-50' 
                    : 'opacity-30 dark:opacity-15 group-hover:opacity-50 dark:group-hover:opacity-30'
                )}
              />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'relative z-10 w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all',
                    activeNav === item.id 
                      ? 'text-foreground dark:text-white shadow-elegant' 
                      : 'text-sidebar-foreground/70 hover:text-foreground dark:hover:text-white'
                  )}
                  onClick={() => {
                    setActiveNav(item.id as 'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph');
                    if (item.id === 'home' && onViewChange) {
                      onViewChange('home');
                    } else if (item.view && onViewChange) {
                      onViewChange(item.view);
                    }
                  }}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 transition-colors" />
                </Button>
            </div>
            
            {/* Small label below icon */}
            <span
              className={cn(
                'text-[10px] font-medium text-center leading-tight transition-colors',
                activeNav === item.id
                  ? 'text-foreground dark:text-white'
                  : 'text-sidebar-foreground/70 group-hover:text-foreground dark:group-hover:text-white'
              )}
            >
              {item.label}
            </span>
          </div>
        ))}

        <div className="flex-1" />

        <div className="h-px w-6 bg-sidebar-foreground/20 my-1" />

        <div className="flex flex-col items-center gap-0.5 mt-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8 rounded-lg',
              },
            }}
          />
          <span className="text-[10px] text-sidebar-foreground font-medium text-center leading-tight">
            Profile
          </span>
        </div>
      </div>

      {/* Close overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-30"
          onClick={onClose}
        />
      )}
    </div>
  );
}
