import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    CheckSquare,
    FileText,
    Home,
    MoreHorizontal,
    Settings,
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
    { id: 'home', icon: Home, label: 'Home', color: 'text-blue-500' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', color: 'text-green-500', view: 'tasks' as const },
    { id: 'docs', icon: FileText, label: 'Docs', color: 'text-purple-500', view: 'docs' as const },
    { id: 'board', icon: CheckSquare, label: 'Board', color: 'text-orange-500', view: 'board' as const },
    { id: 'team', icon: Users, label: 'Teams', color: 'text-red-500' },
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
    { id: 'it', name: 'IT', color: 'blue' },
    { id: 'pm', name: 'Project management', color: 'purple', count: 4 },
    { id: 'doc', name: 'IT Doc', color: 'green' },
  ];

  return (
    <div className="flex h-full bg-background shrink-0">
      {/* Icon Sidebar (Left) - Like ClickUp */}
      <div className="w-16 rounded-lg flex flex-col items-center py-3 gap-2 h-full overflow-y-auto shrink-0 ml-1" style={{ backgroundColor: 'hsl(142 71% 35%)' }}>
        <div className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-xs hover:shadow-lg transition-all cursor-pointer">
          TF
        </div>

        <div className="h-px w-6 bg-white/20 my-1" />

        {navItems.map(item => (
          <div key={item.id} className="flex flex-col items-center gap-0.5 relative group">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-10 h-10 p-0 flex items-center justify-center rounded-lg transition-all relative text-white hover:bg-white/10',
                activeNav === item.id && 'bg-white/20 shadow-md'
              )}
              onClick={() => {
                setActiveNav(item.id);
                if (item.view && onViewChange) {
                  onViewChange(item.view);
                }
              }}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Button>
            
            {/* Small label below icon */}
            <span className="text-[10px] text-white font-medium text-center leading-tight">
              {item.label}
            </span>
          </div>
        ))}

        <div className="flex-1" />

        <div className="h-px w-6 bg-white/20 my-1" />

        <div className="flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-lg hover:bg-white/10 text-white"
            title="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <span className="text-[10px] text-white font-medium text-center leading-tight">
            More
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-lg hover:bg-white/10 text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <span className="text-[10px] text-white font-medium text-center leading-tight">
            Settings
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
