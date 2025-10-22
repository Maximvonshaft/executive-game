import { useEffect, useMemo, useState } from 'react';

export type OrientationInfo = {
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
};

function computeOrientation(): OrientationInfo {
  if (typeof window === 'undefined') {
    return { orientation: 'portrait', aspectRatio: 9 / 16, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } };
  }
  const { innerWidth, innerHeight } = window;
  const orientation = innerWidth >= innerHeight ? 'landscape' : 'portrait';
  const aspectRatio = innerWidth / Math.max(innerHeight, 1);
  const safeArea = resolveSafeAreaInsets();
  return { orientation, aspectRatio, safeArea };
}

function resolveSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const viewport = window.visualViewport;
  if (!viewport) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const top = Math.max(0, viewport.offsetTop);
  const left = Math.max(0, viewport.offsetLeft);
  const right = Math.max(0, window.innerWidth - viewport.width - viewport.offsetLeft);
  const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  return { top, right, bottom, left };
}

export function useOrientation() {
  const [state, setState] = useState<OrientationInfo>(() => computeOrientation());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleChange = () => {
      setState(computeOrientation());
    };

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('resize', handleChange);
    window.visualViewport?.addEventListener('resize', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', handleChange);
      window.visualViewport?.removeEventListener('resize', handleChange);
    };
  }, []);

  return useMemo(() => state, [state]);
}
