import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { Kanban, ChevronRight } from 'lucide-react';

interface BoardWidgetProps {
  onNavigate: () => void;
}

export function BoardWidget({ onNavigate }: BoardWidgetProps) {
  const boards = useBoardStore((state) => state.boards);
  
  const totalBoards = boards.length;
  const recentBoards = boards.slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 p-2">
            <Kanban className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">My Boards</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="gap-1">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
        <div className="text-3xl font-bold text-pink-600 dark:text-pink-500">{totalBoards}</div>
        <div className="text-xs text-muted-foreground">Total Boards</div>
      </div>

      {/* Recent Boards */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {recentBoards.length > 0 ? (
          recentBoards.map((board) => (
            <div
              key={board.id}
              className="group cursor-pointer rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-pink-500/50 hover:shadow-sm"
              onClick={onNavigate}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{board.name}</p>
                  {board.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{board.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20">
            <p className="text-sm text-muted-foreground">No boards yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
