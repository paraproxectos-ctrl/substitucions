
import { useState, useEffect } from 'react';

export const useCapsLock = () => {
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.getModifierState) {
        setCapsLock(event.getModifierState('CapsLock'));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.getModifierState) {
        setCapsLock(event.getModifierState('CapsLock'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return capsLock;
};
