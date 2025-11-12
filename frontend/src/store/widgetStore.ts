import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type CardType = 
  | 'recent-tasks'
  | 'recent-docs'
  | 'board-list'
  | 'task-calendar'
  | 'task-stats'
  | 'workspace-stats'
  | 'quick-embeds';

export interface Card {
  id: string;
  type: CardType;
  position: number;
  config?: {
    title?: string;
    filter?: string;
    limit?: number;
  };
}

interface WidgetStore {
  cards: Card[];
  initializeCards: () => void;
  addCard: (type: CardType, config?: Card['config']) => void;
  removeCard: (cardId: string) => void;
  reorderCards: (startIndex: number, endIndex: number) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  resetToDefault: () => void;
  clearAllCards: () => void;
}

const DEFAULT_CARDS: Card[] = [
  { id: nanoid(), type: 'recent-tasks', position: 0 },
  { id: nanoid(), type: 'recent-docs', position: 1 },
  { id: nanoid(), type: 'board-list', position: 2 },
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      cards: [],

      initializeCards: () => {
        const { cards } = get();
        if (cards.length === 0) {
          set({ cards: DEFAULT_CARDS });
          return;
        }

        // Migration: remove or convert unsupported/legacy types
        const allowed: CardType[] = ['recent-tasks','recent-docs','board-list','task-calendar','task-stats','workspace-stats','quick-embeds'];
        const migrated = cards
          .map((c) => {
            let type = c.type as string;
            if (type === 'task-list') type = 'recent-tasks';
            if (type === 'docs-list') type = 'recent-docs';
            if (type === 'recent-activity') type = 'workspace-stats';
            if (type === 'bookmarks') type = 'quick-embeds';
            return { ...c, type } as Card;
          })
          .filter((c) => (allowed as string[]).includes(c.type))
          .map((c, idx) => ({ ...c, position: idx }));
        set({ cards: migrated });
      },

      addCard: (type: CardType, config?: Card['config']) => {
        set((state) => {
          const newCard: Card = {
            id: nanoid(),
            type,
            position: state.cards.length,
            config,
          };
          return { cards: [...state.cards, newCard] };
        });
      },

      removeCard: (cardId: string) => {
        set((state) => ({
          cards: state.cards
            .filter((card) => card.id !== cardId)
            .map((card, index) => ({ ...card, position: index })),
        }));
      },

      reorderCards: (startIndex: number, endIndex: number) => {
        set((state) => {
          const newCards = [...state.cards];
          const [removed] = newCards.splice(startIndex, 1);
          newCards.splice(endIndex, 0, removed);

          return {
            cards: newCards.map((card, index) => ({
              ...card,
              position: index,
            })),
          };
        });
      },

      updateCard: (cardId: string, updates: Partial<Card>) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId ? { ...card, ...updates } : card
          ),
        }));
      },

      resetToDefault: () => {
        set({ cards: DEFAULT_CARDS });
      },

      clearAllCards: () => {
        set({ cards: [] });
      },
    }),
    {
      name: 'home-cards-storage',
    }
  )
);
