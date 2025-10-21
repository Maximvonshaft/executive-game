import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { colorTokens, highContrastTokens, motionTokens } from './tokens';

type ThemeContextValue = {
  isHighContrast: boolean;
  palette: typeof colorTokens;
  toggleContrast: (force?: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'executive-theme-contrast';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isHighContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === '1';
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty(
      '--motion-duration-short',
      motionTokens.durationShort
    );
    document.documentElement.style.setProperty(
      '--motion-duration-medium',
      motionTokens.durationMedium
    );
    document.documentElement.style.setProperty(
      '--motion-duration-long',
      motionTokens.durationLong
    );
    document.documentElement.style.setProperty('--motion-easing-standard', motionTokens.easingStandard);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const palette = isHighContrast ? highContrastTokens : colorTokens;
    Object.entries(palette).forEach(([token, value]) => {
      document.documentElement.style.setProperty(`--color-${token}`, value);
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, isHighContrast ? '1' : '0');
    }
  }, [isHighContrast]);

  const toggleContrast = useCallback((force?: boolean) => {
    setHighContrast((current) => (typeof force === 'boolean' ? force : !current));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isHighContrast,
      palette: isHighContrast ? highContrastTokens : colorTokens,
      toggleContrast
    }),
    [isHighContrast, toggleContrast]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 中使用');
  }
  return context;
}
