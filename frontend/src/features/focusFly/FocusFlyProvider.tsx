import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';

export type FocusSession = {
  taskId: string;
  taskTitle: string;
  durationMin: number;
  seat?: string;
  startedAt?: string;
  endsAt?: string;
  isRunning: boolean;
  remainingMs: number;
  step: 0 | 1 | 2 | 2.5 | 3 | 4; // Added step 2.5 for boarding pass
  isShowingTicket?: boolean; // Show flight ticket instead of countdown
  isTicketTorn?: boolean; // Ticket tearing animation state
};

interface FocusFlyContextType {
  session: FocusSession | null;
  isOpen: boolean;
  startSession: (taskId: string, taskTitle: string, defaultDurationMin?: number) => void;
  setDuration: (durationMin: number) => void; // New function for setting duration
  selectSeat: (seat: string) => void;
  checkIn: () => void;
  tearTicketAndStartFlight: () => void; // New function for ticket tearing
  pause: () => void;
  resume: () => void;
  extend: (minutes: number) => void;
  endFlight: (markDone: boolean) => void;
  reset: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const FocusFlyContext = createContext<FocusFlyContextType | undefined>(undefined);

const initialState: FocusSession = {
  taskId: '',
  taskTitle: '',
  durationMin: 25, // Default, but user will choose
  isRunning: false,
  remainingMs: 25 * 60 * 1000,
  step: 0, // Start with time selection step
  isShowingTicket: false,
  isTicketTorn: false,
};

export const FocusFlyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateRemaining = useCallback(() => {
    setSession(prev => {
      if (!prev || !prev.isRunning || !prev.endsAt) return prev;
      const remaining = new Date(prev.endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        return { ...prev, remainingMs: 0, isRunning: false, step: 4 };
      }
      return { ...prev, remainingMs: remaining };
    });
  }, []);

  const tearTicketAndStartFlight = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      // Start ticket tearing animation
      return { ...prev, isTicketTorn: true };
    });
    
    // After tear animation, start the actual timer
    setTimeout(() => {
      setSession(prev => {
        if (!prev) return prev;
        const now = new Date();
        const endsAt = new Date(now.getTime() + prev.remainingMs);
        return {
          ...prev,
          startedAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          isRunning: true,
          isShowingTicket: false,
          isTicketTorn: false,
          step: 3, // Move to in-flight step
        };
      });
    }, 1000); // 1 second for tear animation
  }, []);

  useEffect(() => {
    if (session?.isRunning) {
      timerRef.current = setInterval(updateRemaining, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.isRunning, updateRemaining]);

  const startSession = useCallback((taskId: string, taskTitle: string, defaultDurationMin = 25) => {
    setSession({
      ...initialState,
      taskId,
      taskTitle,
      durationMin: defaultDurationMin,
      remainingMs: defaultDurationMin * 60 * 1000,
    });
    setIsOpen(true);
  }, []);

  const setDuration = useCallback((durationMin: number) => {
    setSession(prev => (prev ? { 
      ...prev, 
      durationMin, 
      remainingMs: durationMin * 60 * 1000,
      step: 1 // Move to seat selection after choosing duration
    } : prev));
  }, []);

  const selectSeat = useCallback((seat: string) => {
    setSession(prev => (prev ? { ...prev, seat, step: 2 } : prev));
  }, []);

  const checkIn = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      // Move to boarding pass step with ticket ready to tear
      return {
        ...prev,
        isShowingTicket: true,
        step: 2.5,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setSession(prev => (prev ? { ...prev, isRunning: false } : prev));
  }, []);

  const resume = useCallback(() => {
    setSession(prev => {
        if (!prev) return prev;
        const newEndsAt = new Date(Date.now() + prev.remainingMs);
        return { ...prev, endsAt: newEndsAt.toISOString(), isRunning: true };
    });
  }, []);

  const extend = useCallback((minutes: number) => {
    setSession(prev => {
      if (!prev || !prev.endsAt) return prev;
      const newRemainingMs = prev.remainingMs + minutes * 60 * 1000;
      const newEndsAt = new Date(new Date(prev.endsAt).getTime() + minutes * 60 * 1000);
      return { ...prev, remainingMs: newRemainingMs, endsAt: newEndsAt.toISOString(), durationMin: prev.durationMin + minutes };
    });
  }, []);

  const endFlight = useCallback((markDone: boolean) => {
    // This is where onComplete would be called via a prop from the button
    setSession(prev => (prev ? { ...prev, isRunning: false, step: 4 } : prev));
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setIsOpen(false);
  }, []);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => {
    if (session?.step === 3) {
        if (window.confirm("Are you sure you want to end the flight? Progress will be lost.")) {
            reset();
        }
    } else {
        reset();
    }
  }, [session, reset]);

  return (
    <FocusFlyContext.Provider
      value={{
        session,
        isOpen,
        startSession,
        setDuration,
        selectSeat,
        checkIn,
        tearTicketAndStartFlight,
        pause,
        resume,
        extend,
        endFlight,
        reset,
        openModal,
        closeModal,
      }}
    >
      {children}
    </FocusFlyContext.Provider>
  );
};

export const useFocusFly = () => {
  const context = useContext(FocusFlyContext);
  if (context === undefined) {
    throw new Error('useFocusFly must be used within a FocusFlyProvider');
  }
  return context;
};
