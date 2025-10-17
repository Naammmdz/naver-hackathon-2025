import { useEffect, useState } from 'react';
import { useFocusFly } from '../FocusFlyProvider';

export const useFocusTimer = () => {
  const { session } = useFocusFly();
  const [display, setDisplay] = useState('00:00');

  useEffect(() => {
    if (session) {
      const { remainingMs } = session;
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setDisplay(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }
  }, [session?.remainingMs]);

  return display;
};
