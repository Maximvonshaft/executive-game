import { useEffect, useState } from 'react';

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function readInsetFromCss(variableName: string) {
  if (typeof window === 'undefined') {
    return 0;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
  const parsed = parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureInsets(): SafeAreaInsets {
  return {
    top: readInsetFromCss('--safe-area-top'),
    right: readInsetFromCss('--safe-area-right'),
    bottom: readInsetFromCss('--safe-area-bottom'),
    left: readInsetFromCss('--safe-area-left')
  };
}

export function useSafeAreaInsets() {
  const [insets, setInsets] = useState<SafeAreaInsets>(() => measureInsets());

  useEffect(() => {
    const update = () => {
      setInsets(measureInsets());
    };

    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener?.('resize', update);
    update();

    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener?.('resize', update);
    };
  }, []);

  return insets;
}
