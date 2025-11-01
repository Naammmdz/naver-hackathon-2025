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
import { useState } from 'react';

interface ClickupAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewChange?: (view: 'tasks' | 'docs' | 'board') => void;
  currentView?: 'tasks' | 'docs' | 'board';
}

export function ClickupAppSidebar({ isOpen, onClose, onViewChange, currentView = 'tasks' }: ClickupAppSidebarProps) {
  const [activeNav, setActiveNav] = useState('tasks');
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>(['workspace-1']);

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
    { id: 'team', icon: Users, label: 'Teams' },
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
  const gradientClass = 'bg-gradient-to-br from-[#38bdf8] via-[#a855f7] to-[#f97316]';

  return (
    <div className="flex h-full bg-background shrink-0">
      {/* Icon Sidebar (Left) - Like ClickUp */}
      <div className="w-16 rounded-lg flex flex-col items-center py-3 gap-2 h-full overflow-y-auto shrink-0 ml-1 bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border/60 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-sidebar-foreground/20 hover:bg-sidebar-foreground/30 flex items-center justify-center hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = '/'}>
          <img
            src="/devflow-demo.png"
            alt="DevFlow Logo"
            className="w-8 h-8 object-contain"
          />
        </div>

        <div className="h-px w-6 bg-sidebar-foreground/20 my-1" />

        {navItems.map(item => (
          <div key={item.id} className="flex flex-col items-center gap-0.5 relative group">
            <div className="relative">
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-xl opacity-0 blur-sm transition-all duration-300 z-0',
                  gradientClass,
                  activeNav === item.id ? 'opacity-75' : 'group-hover:opacity-60'
                )}
              />
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'relative z-10 w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all text-sidebar-primary-foreground bg-sidebar-foreground/0 hover:bg-sidebar-foreground/10',
                  activeNav === item.id && 'bg-sidebar-foreground/10 text-sidebar-primary-foreground shadow-lg shadow-[#a855f7]/25'
                )}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.view && onViewChange) {
                    onViewChange(item.view);
                  }
                }}
                title={item.label}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 transition-colors text-sidebar-primary-foreground/80 group-hover:text-sidebar-primary-foreground',
                    activeNav === item.id && 'text-sidebar-primary-foreground'
                  )}
                />
              </Button>
            </div>
            
            {/* Small label below icon */}
            <span
              className={cn(
                'text-[10px] font-medium text-center leading-tight transition-colors',
                activeNav === item.id
                  ? 'text-sidebar-primary-foreground'
                  : 'text-sidebar-primary-foreground/80 group-hover:text-sidebar-primary-foreground'
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
