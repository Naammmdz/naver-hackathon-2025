import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWidgetStore, CardType } from '@/store/widgetStore';
import { 
  CheckSquare, 
  FileText, 
  Kanban, 
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Grid3x3
} from 'lucide-react';

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CARD_TYPES: Array<{
  type: CardType;
  label: string;
  description: string;
  icon: any;
  gradient: string;
}> = [
  {
    type: 'recent-tasks',
    label: 'Recent Tasks',
    description: 'Display your most recent pending tasks',
    icon: Clock,
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    type: 'task-stats',
    label: 'Task Statistics',
    description: 'Overview of your task completion stats',
    icon: BarChart3,
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    type: 'recent-docs',
    label: 'Recent Docs',
    description: 'Quick access to recently updated documents',
    icon: Clock,
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    type: 'board-list',
    label: 'Boards',
    description: 'Overview of all your boards',
    icon: Kanban,
    gradient: 'from-pink-500 to-pink-600',
  },
  {
    type: 'task-calendar',
    label: 'Task Calendar',
    description: 'View tasks with due dates on a calendar',
    icon: Calendar,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    type: 'workspace-stats',
    label: 'Workspace Overview',
    description: 'Complete workspace statistics and metrics',
    icon: PieChart,
    gradient: 'from-green-500 to-green-600',
  },
  {
    type: 'quick-embeds',
    label: 'Quick Embeds',
    description: 'Access Google Docs, Sheets, Slides & more',
    icon: Grid3x3,
    gradient: 'from-cyan-500 to-cyan-600',
  },
];

export function AddCardDialog({ open, onOpenChange }: AddCardDialogProps) {
  const { addCard } = useWidgetStore();

  const handleAddCard = (type: CardType) => {
    addCard(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Card</DialogTitle>
          <DialogDescription>
            Choose a card type to add to your home dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
          {CARD_TYPES.map((cardType) => {
            const Icon = cardType.icon;
            
            return (
              <button
                key={cardType.type}
                onClick={() => handleAddCard(cardType.type)}
                className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className={`rounded-lg bg-gradient-to-br p-2.5 ${cardType.gradient}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {cardType.label}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {cardType.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
