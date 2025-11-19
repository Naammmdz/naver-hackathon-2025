import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardCardConfig } from '@/components/dashboard/DashboardCard';

interface DashboardState {
  cards: DashboardCardConfig[];
  addCard: (card: DashboardCardConfig) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<DashboardCardConfig>) => void;
  reorderCards: (cards: DashboardCardConfig[]) => void;
  resetToDefault: () => void;
}

const defaultCards: DashboardCardConfig[] = [
  {
    id: 'tasks-overview',
    type: 'stat',
    title: 'Tasks Overview',
    description: 'Your task statistics',
    size: 'medium',
    visible: true,
    order: 0,
    color: 'border-l-primary',
  },
  {
    id: 'documents-stat',
    type: 'stat',
    title: 'Documents',
    description: 'Total documents',
    size: 'small',
    visible: true,
    order: 1,
    color: 'border-l-secondary',
  },
  {
    id: 'boards-stat',
    type: 'stat',
    title: 'Boards',
    description: 'Active boards',
    size: 'small',
    visible: true,
    order: 2,
    color: 'border-l-accent',
  },
  {
    id: 'team-stat',
    type: 'stat',
    title: 'Team Members',
    description: 'Workspace members',
    size: 'small',
    visible: true,
    order: 3,
    color: 'border-l-success',
  },
  {
    id: 'recent-documents',
    type: 'list',
    title: 'Recent Documents',
    description: 'Recently updated documents',
    size: 'medium',
    visible: true,
    order: 4,
    color: 'border-l-secondary',
  },
  {
    id: 'recent-boards',
    type: 'list',
    title: 'Recent Boards',
    description: 'Recently updated boards',
    size: 'medium',
    visible: true,
    order: 5,
    color: 'border-l-accent',
  },
  {
    id: 'task-analytics',
    type: 'chart',
    title: 'Task Analytics',
    description: 'Visualize task completion trends',
    size: 'large',
    visible: true,
    order: 6,
    color: 'border-l-primary',
  },
  {
    id: 'embed-link',
    type: 'custom',
    title: 'Embedded Link',
    description: 'Embed external content or links',
    size: 'medium',
    visible: true,
    order: 7,
    color: 'border-l-primary',
  },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      cards: defaultCards,
      
      addCard: (card) =>
        set((state) => ({
          cards: [...state.cards, { ...card, order: state.cards.length }],
        })),
      
      removeCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
        })),
      
      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          ),
        })),
      
      reorderCards: (cards) =>
        set(() => ({
          cards: cards.map((card, index) => ({ ...card, order: index })),
        })),
      
      resetToDefault: () =>
        set(() => ({
          cards: defaultCards,
        })),
    }),
    {
      name: 'dashboard-storage',
      // Filter out deprecated cards and add new cards on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Remove deprecated cards
          state.cards = state.cards.filter((card) => card.id !== 'quick-actions');
          
          // Add new cards if they don't exist
          const hasTaskAnalytics = state.cards.some((card) => card.id === 'task-analytics');
          if (!hasTaskAnalytics) {
            state.cards.push({
              id: 'task-analytics',
              type: 'chart',
              title: 'Task Analytics',
              description: 'Visualize task completion trends',
              size: 'large',
              visible: true,
              order: state.cards.length,
              color: 'border-l-primary',
            });
          }

          // Update existing embed-link card title or add new one
          const embedLinkCard = state.cards.find((card) => card.id === 'embed-link');
          if (embedLinkCard) {
            // Update title if it's the old one
            if (embedLinkCard.title === 'Embed Link') {
              embedLinkCard.title = 'Embedded Link';
            }
          } else {
            // Add new card if it doesn't exist
            state.cards.push({
              id: 'embed-link',
              type: 'custom',
              title: 'Embedded Link',
              description: 'Embed external content or links',
              size: 'medium',
              visible: true,
              order: state.cards.length,
              color: 'border-l-primary',
            });
          }

          // Migrate old colors to theme colors
          state.cards = state.cards.map(card => {
            if (card.color?.includes('blue-500')) return { ...card, color: 'border-l-primary' };
            if (card.color?.includes('orange-500')) return { ...card, color: 'border-l-secondary' };
            if (card.color?.includes('pink-500')) return { ...card, color: 'border-l-accent' };
            if (card.color?.includes('green-500')) return { ...card, color: 'border-l-success' };
            if (card.color?.includes('purple-500')) return { ...card, color: 'border-l-primary' };
            if (card.color?.includes('cyan-500')) return { ...card, color: 'border-l-primary' };
            if (card.color?.includes('red-500')) return { ...card, color: 'border-l-destructive' };
            if (card.color?.includes('yellow-500')) return { ...card, color: 'border-l-warning' };
            if (card.color?.includes('indigo-500')) return { ...card, color: 'border-l-primary' };
            return card;
          });
        }
      },
    }
  )
);

