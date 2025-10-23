import { useEffect, useState } from 'react';

export type Orientation = 'portrait' | 'landscape';

function resolveOrientation(): Orientation {
  if (typeof window === 'undefined') {
    return 'portrait';
  }
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape') ? 'landscape' : 'portrait';
  }
  if (typeof window.orientation === 'number') {
    return Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
  }
  return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>(() => resolveOrientation());

  useEffect(() => {
    const handleChange = () => {
      setOrientation(resolveOrientation());
    };

    window.addEventListener('resize', handleChange);
    window.screen?.orientation?.addEventListener?.('change', handleChange);
    handleChange();

    return () => {
      window.removeEventListener('resize', handleChange);
      window.screen?.orientation?.removeEventListener?.('change', handleChange);
    };
  }, []);

  return orientation;
}
