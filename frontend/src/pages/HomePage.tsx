import { RecentTasksCard } from '@/components/home/cards/RecentTasksCard';
import { RecentDocsCard } from '@/components/home/cards/RecentDocsCard';
import { BoardListCard } from '@/components/home/cards/BoardListCard';
import { TaskStatsCard } from '@/components/home/cards/TaskStatsCard';
import { TaskCalendarCard } from '@/components/home/cards/TaskCalendarCard';
import { WorkspaceStatsCard } from '@/components/home/cards/WorkspaceStatsCard';
import { QuickEmbedsCard } from '@/components/home/cards/QuickEmbedsCard';
import { AddCardDialog } from '@/components/home/AddCardDialog';
import { Button } from '@/components/ui/button';
import { useWidgetStore, Card, CardType } from '@/store/widgetStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X, Sparkles } from 'lucide-react';
import { VisionHeader } from '@/components/home/VisionHeader';
import { useEffect, useState } from 'react';

interface HomePageProps {
  onViewChange: (view: 'tasks' | 'docs' | 'board') => void;
}

// Sortable Card Container
function SortableCard({
  card,
  onNavigate,
  onRemove,
}: {
  card: Card;
  onNavigate: (view: 'tasks' | 'docs' | 'board') => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderCard = () => {
    switch (card.type) {
      case 'recent-tasks':
        return <RecentTasksCard onNavigate={() => onNavigate('tasks')} />;
      case 'task-stats':
        return <TaskStatsCard />;
      case 'task-calendar':
        return <TaskCalendarCard onNavigate={() => onNavigate('tasks')} />;
      case 'recent-docs':
        return <RecentDocsCard onNavigate={() => onNavigate('docs')} />;
      case 'board-list':
        return <BoardListCard onNavigate={() => onNavigate('board')} />;
      case 'workspace-stats':
        return <WorkspaceStatsCard />;
      case 'quick-embeds':
        return <QuickEmbedsCard />;
      default:
        return (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-xs">Card type: {card.type}</p>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 ring-1 ring-white/5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      {/* Drag Handle (visual only, whole card is draggable) */}
      <div
        className="absolute left-2 top-2 z-10 cursor-grab rounded-md p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 z-20 cursor-pointer rounded-md p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
        title="Remove card"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
      {/* Hover gradient aura */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_0%_0%,rgba(147,51,234,0.15),transparent_60%),radial-gradient(80%_60%_at_100%_0%,rgba(34,211,238,0.12),transparent_60%)]" />
      </div>
      <div className="relative z-10 p-4">
        {renderCard()}
      </div>
    </div>
  );
}

export default function HomePage({ onViewChange }: HomePageProps) {
  const { cards, initializeCards, reorderCards, removeCard } = useWidgetStore();
  const removeAll = () => useWidgetStore.getState().clearAllCards();
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  );
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Initialize cards on mount
  useEffect(() => {
    initializeCards();
  }, [initializeCards]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((c) => c.id === active.id);
      const newIndex = cards.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderCards(oldIndex, newIndex);
      }
    }
  };

  return (
    <div className="relative h-full overflow-auto bg-gradient-to-b from-background via-background to-background">
      {/* Futuristic ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Vision board-style header */}
        <VisionHeader workspaceName={activeWorkspace?.name} />
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-end gap-2">
          <Button onClick={() => setAddCardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={() => removeAll()}
          >
            Remove All
          </Button>
        </div>

        {/* Cards Grid */}
        {cards.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    onNavigate={(view) => onViewChange(view)}
                    onRemove={() => removeCard(card.id)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeCard && (
                <div className="rounded-lg border border-border/60 bg-card p-4 shadow-lg opacity-90">
                  <div className="text-center text-sm text-muted-foreground">
                    Moving card...
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="relative text-center">
              <div className="absolute -inset-20 animate-pulse rounded-full bg-primary/5 blur-3xl" />
              <div className="relative space-y-6">
                <div className="relative inline-block">
                  <Sparkles className="mx-auto h-20 w-20 animate-pulse text-primary" />
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{animationDuration: '3s'}} />
                </div>
                <div className="space-y-2">
                  <h3 className="bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-3xl font-bold text-transparent">
                    Create Your Space
                  </h3>
                  <p className="text-muted-foreground">
                    Start building your personalized dashboard
                  </p>
                </div>
                <Button
                  onClick={() => setAddCardOpen(true)}
                  size="lg"
                  className="group relative gap-3 overflow-hidden bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Plus className="relative h-5 w-5" />
                  <span className="relative">Add Your First Card</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Dialog */}
      <AddCardDialog open={addCardOpen} onOpenChange={setAddCardOpen} />
    </div>
  );
}
