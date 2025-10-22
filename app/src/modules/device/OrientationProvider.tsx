import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

type Orientation = 'landscape' | 'portrait';

type AspectPreset = '19.5:9' | '16:9' | 'ultraWide' | 'square';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface OrientationContextValue {
  orientation: Orientation;
  aspectPreset: AspectPreset;
  width: number;
  height: number;
  ratio: number;
  safeArea: SafeAreaInsets;
}

const defaultSafeArea: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const OrientationContext = createContext<OrientationContextValue>({
  orientation: 'portrait',
  aspectPreset: '16:9',
  width: 0,
  height: 0,
  ratio: 0,
  safeArea: defaultSafeArea
});

function inferAspectPreset(width: number, height: number): AspectPreset {
  if (!width || !height) return '16:9';
  const ratio = width / height;
  if (ratio >= 2.1) return 'ultraWide';
  if (ratio >= 1.9) return '19.5:9';
  if (ratio >= 1.55) return '16:9';
  return 'square';
}

function attachSafeAreaProbe(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById('safe-area-probe');
  if (existing) return existing as HTMLDivElement;
  const probe = document.createElement('div');
  probe.id = 'safe-area-probe';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position: fixed',
    'pointer-events: none',
    'opacity: 0',
    'inset: 0',
    'padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  ].join(';');
  document.body.appendChild(probe);
  return probe;
}

function readSafeArea(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return defaultSafeArea;
  }
  const probe = attachSafeAreaProbe();
  if (!probe) return defaultSafeArea;
  const style = window.getComputedStyle(probe);
  const parse = (value: string) => (value ? parseFloat(value) || 0 : 0);
  return {
    top: parse(style.paddingTop),
    right: parse(style.paddingRight),
    bottom: parse(style.paddingBottom),
    left: parse(style.paddingLeft)
  };
}

function resolveOrientation(width: number, height: number): Orientation {
  if (!width || !height) return 'portrait';
  return width >= height ? 'landscape' : 'portrait';
}

export function OrientationProvider({ children }: { children: React.ReactNode }) {
  const [dims, setDims] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight
  }));
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>(() => readSafeArea());

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setDims({ width: window.innerWidth, height: window.innerHeight });
      setSafeArea(readSafeArea());
    };
    handleResize();

    const orientationMedia = window.matchMedia('(orientation: landscape)');
    const handleOrientationChange = () => {
      handleResize();
    };

    window.addEventListener('resize', handleResize);
    orientationMedia.addEventListener('change', handleOrientationChange);

    const probe = attachSafeAreaProbe();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && probe) {
      observer = new ResizeObserver(() => {
        setSafeArea(readSafeArea());
      });
      observer.observe(probe);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      orientationMedia.removeEventListener('change', handleOrientationChange);
      if (observer) {
        observer.disconnect();
      }
      if (probe && probe.parentElement === document.body) {
        document.body.removeChild(probe);
      }
    };
  }, []);

  const value = useMemo<OrientationContextValue>(() => {
    const { width, height } = dims;
    const ratio = height === 0 ? 0 : width / height;
    return {
      orientation: resolveOrientation(width, height),
      aspectPreset: inferAspectPreset(width, height),
      width,
      height,
      ratio,
      safeArea
    };
  }, [dims, safeArea]);

  return <OrientationContext.Provider value={value}>{children}</OrientationContext.Provider>;
}

export function useOrientation() {
  return useContext(OrientationContext);
}
