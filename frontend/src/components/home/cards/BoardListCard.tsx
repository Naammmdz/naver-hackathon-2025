import { useBoardStore } from '@/store/boardStore';
import { Kanban, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BoardListCardProps {
  onNavigate: () => void;
}

export function BoardListCard({ onNavigate }: BoardListCardProps) {
  const boards = useBoardStore((state) => state.boards);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Boards</h3>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="h-7 gap-1 px-2 text-xs">
          View All
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {boards.length > 0 ? (
          boards.slice(0, 6).map((board) => (
            <div
              key={board.id}
              className="group cursor-pointer rounded-md border border-border/40 bg-background/50 p-2.5 transition-all hover:border-pink-500/50 hover:bg-background"
              onClick={onNavigate}
            >
              <div className="flex items-start gap-2">
                <Kanban className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-pink-500" />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-xs font-medium text-foreground">{board.name}</p>
                  {board.description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {board.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">No boards yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
