import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isChatOpen: boolean;
  chatWidth: number;
  
  // Actions
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setChatWidth: (width: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isChatOpen: false,
      chatWidth: 400, // Default width in pixels

      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      setChatOpen: (open: boolean) => set({ isChatOpen: open }),
      setChatWidth: (width: number) => set({ chatWidth: width }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({ 
        isChatOpen: state.isChatOpen,
        chatWidth: state.chatWidth 
      }),
    }
  )
);
