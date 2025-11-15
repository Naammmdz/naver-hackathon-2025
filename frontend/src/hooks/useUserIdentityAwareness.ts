import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getColor } from '@/lib/userColors';

/**
 * Hook to manage user identity in Yjs awareness
 * This ensures user info (userId, name, email, avatarUrl, color) is always present
 * and separate from view-specific awareness data (like boardCursor)
 */
export function useUserIdentityAwareness() {
  const { userId } = useAuth();
  const { user } = useUser();
  const seededRef = useRef(false);
  const reSeedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cleanup: (() => void) | null = null;
    let checkProviderInterval: ReturnType<typeof setInterval> | null = null;

    const setupAwareness = (provider: HocuspocusProvider) => {
      const awareness = provider.awareness;
      if (!awareness) return null;

      // Seed user identity immediately
      const seedUserIdentity = () => {
        try {
          const currentState = awareness.getLocalState() || {};
          const name = user?.fullName || user?.firstName || user?.username || userId;
          const color = getColor(userId);
          
          // Always ensure user identity is present - ALWAYS set these fields (don't use || fallback)
          // This is critical because BlockNote or other code might have overwritten it
          // We need to ensure userId, name, email, avatarUrl, color are ALWAYS present
          const updatedState = {
            ...currentState, // Preserve ALL existing state (boardCursor, BlockNote cursor, etc.)
            // User identity fields - ALWAYS set these explicitly
            userId, // Always set userId
            name: name, // Always use our name (don't use currentState.name as fallback)
            email: user?.emailAddresses?.[0]?.emailAddress || `${userId}@example.com`, // Always set email
            avatarUrl: user?.imageUrl, // Always set avatarUrl
            color: color, // Always use our color (consistent based on userId)
            // DO NOT touch boardCursor, cursor, or any other view-specific fields
          };

          // Always update to ensure user identity is present (even if it seems to exist)
          // This is critical because other code (BlockNote, Canvas) might have overwritten it
          awareness.setLocalState(updatedState);
          seededRef.current = true;
          console.log('[useUserIdentityAwareness] Seeded/updated user identity:', { 
            userId, 
            name: updatedState.name,
            email: updatedState.email,
            color: updatedState.color,
            hasBoardCursor: !!currentState.boardCursor,
            hasBlockNoteCursor: !!currentState.cursor
          });
        } catch (err) {
          console.warn('[useUserIdentityAwareness] Failed to seed:', err);
        }
      };

      // Seed immediately
      seedUserIdentity();

      // Also seed periodically to ensure it persists (handles cases where it gets overwritten)
      // This is especially important for home/board/teams views where BlockNote doesn't seed awareness
      const periodicSeed = setInterval(() => {
        const currentState = awareness.getLocalState() || {};
        // Check if user identity is missing or incorrect
        const needsReseed = 
          !currentState.userId || 
          currentState.userId !== userId || 
          !currentState.name || 
          !currentState.email ||
          !currentState.color;
        
        if (needsReseed) {
          console.log('[useUserIdentityAwareness] Periodic check - re-seeding user identity (missing or incorrect)');
          seedUserIdentity();
        }
      }, 500); // Check every 500ms to catch overwrites faster

      // Listen for awareness changes and re-seed if user identity is missing or overwritten
      // BlockNote sets a random color, so we need to check if color matches our expected color
      const handleAwarenessChange = () => {
        const states = awareness.getStates();
        const selfClientId = awareness.clientID;
        const selfState = states.get(selfClientId);

        // Check if user identity is missing, invalid, or overwritten
        // BlockNote might set a random color, so we need to check if color matches our expected color
        const expectedColor = getColor(userId);
        const needsReseed = 
          !selfState || 
          !selfState.userId || 
          selfState.userId !== userId || 
          !selfState.name || 
          !selfState.email ||
          !selfState.color ||
          selfState.color !== expectedColor; // Check if color was overwritten (e.g., by BlockNote's random color)

        if (needsReseed) {
          console.log('[useUserIdentityAwareness] Awareness change detected - user identity missing/overwritten, re-seeding:', {
            hasState: !!selfState,
            userId: selfState?.userId,
            expectedUserId: userId,
            hasName: !!selfState?.name,
            hasEmail: !!selfState?.email,
            color: selfState?.color,
            expectedColor
          });
          
          // Re-seed immediately (no debounce) to ensure user identity is always present
          seedUserIdentity();

          // Also schedule a delayed check to ensure it persists
          if (reSeedTimeoutRef.current) {
            clearTimeout(reSeedTimeoutRef.current);
          }
          reSeedTimeoutRef.current = setTimeout(() => {
            const currentState = awareness.getLocalState() || {};
            const currentExpectedColor = getColor(userId);
            if (!currentState.userId || 
                currentState.userId !== userId || 
                !currentState.name || 
                !currentState.email ||
                !currentState.color ||
                currentState.color !== currentExpectedColor) {
              console.log('[useUserIdentityAwareness] Delayed re-seed - user identity still missing/overwritten');
              seedUserIdentity();
            }
            reSeedTimeoutRef.current = null;
          }, 200);
        }
      };

      awareness.on('change', handleAwarenessChange);

      // Also listen for provider status changes
      const providerAny = provider as any;
      let statusHandler: ((status: string) => void) | null = null;
      
      if (providerAny.on) {
        statusHandler = (status: string) => {
          if (status === 'connected') {
            console.log('[useUserIdentityAwareness] Provider reconnected - re-seeding user identity');
            // Re-seed when reconnected
            setTimeout(() => seedUserIdentity(), 100);
          }
        };
        providerAny.on('status', statusHandler);
      }

      // Return cleanup function
      return () => {
        clearInterval(periodicSeed);
        awareness.off('change', handleAwarenessChange);
        if (providerAny.off && statusHandler) {
          providerAny.off('status', statusHandler);
        }
        if (reSeedTimeoutRef.current) {
          clearTimeout(reSeedTimeoutRef.current);
          reSeedTimeoutRef.current = null;
        }
      };
    };

    // Check for provider
    const provider = (window as any).__WORKSPACE_PROVIDER as HocuspocusProvider | null;
    if (provider) {
      cleanup = setupAwareness(provider);
    } else {
      // Poll for provider
      checkProviderInterval = setInterval(() => {
        const p = (window as any).__WORKSPACE_PROVIDER as HocuspocusProvider | null;
        if (p) {
          if (checkProviderInterval) {
            clearInterval(checkProviderInterval);
            checkProviderInterval = null;
          }
          cleanup = setupAwareness(p);
        }
      }, 100);
      
      // Also listen for provider ready event
      const handleProviderReady = () => {
        const p = (window as any).__WORKSPACE_PROVIDER as HocuspocusProvider | null;
        if (p && !cleanup) {
          if (checkProviderInterval) {
            clearInterval(checkProviderInterval);
            checkProviderInterval = null;
          }
          cleanup = setupAwareness(p);
        }
      };
      window.addEventListener('workspace-provider-ready', handleProviderReady);
      
      return () => {
        if (checkProviderInterval) {
          clearInterval(checkProviderInterval);
        }
        window.removeEventListener('workspace-provider-ready', handleProviderReady);
        if (cleanup) {
          cleanup();
        }
      };
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [userId, user]);
}

