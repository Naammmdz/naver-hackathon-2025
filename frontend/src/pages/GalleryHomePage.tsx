import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useTaskStore } from '@/store/taskStore';
import { useDocumentStore } from '@/store/documentStore';
import { useWidgetStore, Card } from '@/store/widgetStore';
import { Clock, Folder, Plus, X, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RecentTasksCard } from '@/components/home/cards/RecentTasksCard';
import { RecentDocsCard } from '@/components/home/cards/RecentDocsCard';
import { BoardListCard } from '@/components/home/cards/BoardListCard';
import { TaskStatsCard } from '@/components/home/cards/TaskStatsCard';
import { TaskCalendarCard } from '@/components/home/cards/TaskCalendarCard';
import { WorkspaceStatsCard } from '@/components/home/cards/WorkspaceStatsCard';
import { QuickEmbedsCard } from '@/components/home/cards/QuickEmbedsCard';
import { AddCardDialog } from '@/components/home/AddCardDialog';
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

interface HomePageProps {
  onViewChange: (view: 'tasks' | 'docs' | 'board') => void;
}

// Color schemes for different card types
const getCardGradient = (cardType: string) => {
  const gradients: Record<string, string> = {
    'recent-tasks': 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
    'task-stats': 'from-blue-500/20 via-cyan-500/20 to-teal-500/20',
    'task-calendar': 'from-orange-500/20 via-amber-500/20 to-yellow-500/20',
    'recent-docs': 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
    'board-list': 'from-indigo-500/20 via-purple-500/20 to-pink-500/20',
    'workspace-stats': 'from-cyan-500/20 via-blue-500/20 to-indigo-500/20',
    'quick-embeds': 'from-fuchsia-500/20 via-purple-500/20 to-indigo-500/20',
  };
  return gradients[cardType] || 'from-gray-500/20 via-slate-500/20 to-zinc-500/20';
};

const getCardAccentColor = (cardType: string) => {
  const colors: Record<string, string> = {
    'recent-tasks': 'group-hover:border-purple-500/40',
    'task-stats': 'group-hover:border-cyan-500/40',
    'task-calendar': 'group-hover:border-amber-500/40',
    'recent-docs': 'group-hover:border-emerald-500/40',
    'board-list': 'group-hover:border-pink-500/40',
    'workspace-stats': 'group-hover:border-blue-500/40',
    'quick-embeds': 'group-hover:border-fuchsia-500/40',
  };
  return colors[cardType] || 'group-hover:border-foreground/20';
};

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
  const [showMenu, setShowMenu] = useState(false);
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
      className="group relative cursor-grab overflow-hidden rounded-2xl border border-border/40 transition-all hover:shadow-2xl active:cursor-grabbing"
    >
      {/* Colorful gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getCardGradient(card.type)} opacity-100 transition-opacity`} />
      
      {/* Animated border on hover */}
      <div className={`absolute inset-0 rounded-2xl border-2 border-transparent ${getCardAccentColor(card.type)} transition-all`} />

      {/* Card Content */}
      <div className="relative z-10 px-6 pb-12 pt-6">
        {renderCard()}
      </div>
      
      {/* Bottom 3-dot Menu - Remove only */}
      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 rounded-full bg-background/90 p-1.5 backdrop-blur-sm transition-all hover:bg-background"
          title="Card options"
        >
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
        </button>
        
        {/* Dropdown Menu */}
        {showMenu && (
          <div 
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/40 bg-background/95 shadow-xl backdrop-blur-sm"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Remove Option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRemove();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${getCardGradient(card.type)} opacity-0 transition-opacity group-hover:opacity-100`} />
    </div>
  );
}

interface StatCardProps {
  value: number | string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

// Gradient colors for each stat card
const statGradients = [
  'from-purple-500/10 via-pink-500/10 to-rose-500/10', // Active Projects
  'from-blue-500/10 via-cyan-500/10 to-teal-500/10',   // Completed Today
  'from-orange-500/10 via-amber-500/10 to-yellow-500/10', // Priority Items
  'from-green-500/10 via-emerald-500/10 to-teal-500/10',  // Digital Assets
];

const statAccents = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-orange-500 to-amber-500',
  'from-green-500 to-emerald-500',
];

function StatCard({ value, label, sublabel, index = 0 }: StatCardProps & { index?: number }) {
  const gradient = statGradients[index % statGradients.length];
  const accent = statAccents[index % statAccents.length];
  
  return (
    <div className="group relative flex flex-col items-center justify-center space-y-3 overflow-hidden rounded-2xl border border-border/30 bg-background/50 p-8 backdrop-blur transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />
      
      {/* Animated gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`} />
      
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent} opacity-60`} />
      
      <div className="relative z-10 text-7xl font-light tracking-tighter text-foreground/90">
        {value}
      </div>
      <div className="relative z-10 text-center">
        <div className={`text-sm font-medium uppercase tracking-[0.2em] bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
          {label}
        </div>
        {sublabel && (
          <div className="mt-1 text-xs italic text-muted-foreground/60">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GalleryHomePage({ onViewChange }: HomePageProps) {
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId)
  );
  
  const tasks = useTaskStore((state) => state.tasks);
  const documents = useDocumentStore((state) => state.documents);
  const { cards, initializeCards, reorderCards, removeCard } = useWidgetStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Initialize cards on mount
  useEffect(() => {
    initializeCards();
  }, [initializeCards]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

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

  // Calculate statistics
  const completedToday = tasks.filter(
    (t) => t.completed && format(new Date(t.updatedAt || t.createdAt), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
  ).length;

  const priorityItems = tasks.filter((t) => !t.completed && t.priority === 'high').length;

  const activeProjects = useWorkspaceStore((state) => state.workspaces.length);

  const digitalAssets = documents.length;

  return (
    <div className="relative h-full overflow-auto bg-background">
      {/* Subtle grain texture overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.015]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
      }} />

      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:px-12">
        {/* Header Section - Magazine Style */}
        <header className="mb-16 space-y-6 border-b border-border/20 pb-12">
          <div className="flex items-baseline justify-between">
            <time className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </time>
          </div>
          
          <div className="space-y-4">
            <h1 className="font-serif text-6xl font-light tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Everything is
            </h1>
            <h2 className="font-serif text-6xl font-light italic tracking-tight text-foreground/70 sm:text-7xl lg:text-8xl">
              evolving.
            </h2>
          </div>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your workspace is a frontier environment engineered to maximize what's possible
            with today's latest workflow—autonomous task management, comprehensive project
            oversight, and seamless collaboration.
          </p>

          {activeWorkspace && (
            <div className="pt-4 text-sm italic text-muted-foreground/60">
              Available as a unified workspace in <span className="not-italic font-medium">{activeWorkspace.name}</span>
            </div>
          )}
        </header>

        {/* Statistics Grid */}
        <section className="mb-20">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <StatCard
              value={activeProjects}
              label="Active Projects"
              sublabel="0 in development"
              index={0}
            />
            <StatCard
              value={completedToday}
              label="Completed Today"
              sublabel={`${tasks.filter(t => !t.completed).length > 0 ? Math.round((completedToday / tasks.length) * 100) : 0}% efficiency rate`}
              index={1}
            />
            <StatCard
              value={priorityItems}
              label="Priority Items"
              sublabel="Requires immediate attention"
              index={2}
            />
            <StatCard
              value={digitalAssets}
              label="Digital Assets"
              sublabel="Documents and boards"
              index={3}
            />
          </div>
        </section>

        {/* Latest Works Section - Draggable Cards */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-border/20 pb-4">
            <h3 className="font-serif text-4xl font-light tracking-tight text-foreground">
              Latest Works
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Recent activity across your workspace
              </div>
              <Button
                onClick={() => setAddCardOpen(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Card
              </Button>
            </div>
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-border/30">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  No cards yet. Start creating.
                </p>
                <Button
                  onClick={() => setAddCardOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Card
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Add Card Dialog */}
        <AddCardDialog open={addCardOpen} onOpenChange={setAddCardOpen} />

        {/* Footer Spacer */}
        <div className="mt-20 border-t border-border/20 pt-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Last updated {format(currentDate, 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5" />
              <span>Workspace Edition</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
