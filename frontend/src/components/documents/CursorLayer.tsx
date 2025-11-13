import { useEffect, useRef } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { User } from '@clerk/clerk-react';

interface CursorPosition {
  x: number;
  y: number;
  user: {
    name: string;
    color: string;
  };
}

interface CursorLayerProps {
  awareness: Awareness | null;
  currentUser: User | null;
}

const COLORS = [
  '#958DF1', '#F98181', '#FBBC88', '#FAF594',
  '#70CFF8', '#94FADB', '#B9F18D', '#C7CEEA',
];

export function CursorLayer({ awareness, currentUser }: CursorLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!awareness || !containerRef.current) return;

    const updateCursors = () => {
      // Clear existing cursors
      cursorsRef.current.forEach((cursor) => cursor.remove());
      cursorsRef.current.clear();

      // Get all awareness states except our own
      const states = awareness.getStates();
      const currentClientId = awareness.clientID;

      states.forEach((state, clientId) => {
        if (clientId === currentClientId) return;

        const cursor = state.cursor as CursorPosition | undefined;
        if (!cursor) return;

        const cursorElement = document.createElement('div');
        cursorElement.className = 'absolute pointer-events-none z-50';
        cursorElement.style.left = `${cursor.x}px`;
        cursorElement.style.top = `${cursor.y}px`;
        
        const svg = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3L17 17M3 17L17 3" stroke="${cursor.user.color}" stroke-width="2" stroke-linecap="round"/>
            <circle cx="10" cy="10" r="8" stroke="${cursor.user.color}" stroke-width="2" fill="none"/>
          </svg>
        `;
        cursorElement.innerHTML = svg;

        const label = document.createElement('div');
        label.className = 'absolute top-5 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap';
        label.style.backgroundColor = cursor.user.color;
        label.textContent = cursor.user.name;

        cursorElement.appendChild(label);
        containerRef.current?.appendChild(cursorElement);
        cursorsRef.current.set(clientId, cursorElement);
      });
    };

    awareness.on('update', updateCursors);

    return () => {
      awareness.off('update', updateCursors);
      cursorsRef.current.forEach((cursor) => cursor.remove());
      cursorsRef.current.clear();
    };
  }, [awareness]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
}

// Helper to get color for user
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

