import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type VisionItemType = 'sticker' | 'text' | 'emoji' | 'image';

export interface VisionItem {
  id: string;
  type: VisionItemType;
  x: number; // px from left
  y: number; // px from top
  r?: number; // rotation deg
  s?: number; // scale factor
  content?: string; // text, emoji, or image url
  color?: string;
}

interface VisionBoardStore {
  items: VisionItem[];
  addItem: (partial?: Partial<VisionItem>) => void;
  updateItem: (id: string, patch: Partial<VisionItem>) => void;
  removeItem: (id: string) => void;
  reset: () => void;
}

const DEFAULT_ITEMS: VisionItem[] = [
  { id: nanoid(), type: 'text', x: 28, y: 22, r: -2, s: 1, content: 'Welcome back!', color: 'from-foreground via-purple-400 to-cyan-400' },
  { id: nanoid(), type: 'emoji', x: 300, y: 26, r: 0, s: 1.2, content: '👋' },
  { id: nanoid(), type: 'sticker', x: 150, y: 90, r: -6, s: 1, content: 'vision board' },
];

export const useVisionBoardStore = create<VisionBoardStore>()(
  persist(
    (set) => ({
      items: DEFAULT_ITEMS,
      addItem: (partial) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              id: nanoid(),
              type: partial?.type ?? 'text',
              x: partial?.x ?? 40,
              y: partial?.y ?? 40,
              r: partial?.r ?? 0,
              s: partial?.s ?? 1,
              content: partial?.content ?? 'note',
              color: partial?.color,
            },
          ],
        })),
      updateItem: (id, patch) =>
        set((state) => ({ items: state.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
      removeItem: (id) => set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
      reset: () => set({ items: DEFAULT_ITEMS }),
    }),
    { name: 'vision-board-header' }
  )
);