import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckSquare, FileText } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: 'tasks' | 'docs';
  onViewChange: (view: 'tasks' | 'docs') => void;
}

export function AppLayout({ children, currentView, onViewChange }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">DevHolic</h2>
          <p className="text-sm text-muted-foreground">Productivity Suite</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={currentView === 'tasks' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start',
              currentView === 'tasks' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onViewChange('tasks')}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </Button>
          
          <Button
            variant={currentView === 'docs' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start',
              currentView === 'docs' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onViewChange('docs')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Docs
          </Button>
        </nav>

        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            © 2025 DevHolic
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
