import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/clerk-react';
import {
  CheckSquare,
  FileText,
  Home,
  Kanban,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClickupAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewChange?: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void;
  currentView?: 'tasks' | 'docs' | 'board' | 'home' | 'teams';
}

export function ClickupAppSidebar({ isOpen, onClose, onViewChange, currentView = 'home' }: ClickupAppSidebarProps) {
  const [activeNav, setActiveNav] = useState(currentView || 'home');
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
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', view: 'tasks' as const },
    { id: 'docs', icon: FileText, label: 'Docs', view: 'docs' as const },
    { id: 'board', icon: Kanban, label: 'Board', view: 'board' as const },
    { id: 'teams', icon: Users, label: 'Teams', view: 'teams' as const },
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
  return (
    <div className="flex h-full bg-background shrink-0">
      {/* Icon Sidebar (Left) - Like ClickUp */}
      <div className="w-16 rounded-lg flex flex-col items-center py-3 gap-2 h-full overflow-y-auto shrink-0 ml-1 bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border/60 shadow-sm">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-80 transition-all cursor-pointer bg-primary/10 hover:bg-primary/20 p-1.5" onClick={() => window.location.href = '/'}>
          <img
            src="/devflow-demo.png"
            alt="DevFlow Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="h-px w-6 bg-sidebar-foreground/20 my-1" />

        {navItems.map(item => (
          <div key={item.id} className="flex flex-col items-center gap-0.5 relative group">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all',
                activeNav === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                  : 'text-sidebar-primary-foreground/70 hover:text-foreground hover:bg-foreground/10'
              )}
              onClick={() => {
                setActiveNav(item.id);
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

            {/* Small label below icon */}
            <span
              className={cn(
                'text-[10px] font-medium text-center leading-tight transition-colors',
                activeNav === item.id
                  ? 'text-foreground dark:text-white'
                  : 'text-sidebar-primary-foreground/70 group-hover:text-foreground'
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
          <span className="text-[10px] text-sidebar-primary-foreground font-medium text-center leading-tight">
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
