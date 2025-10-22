import { PropsWithChildren } from 'react';
import { spacingScale } from '../theme/tokens';
import '../theme/global.css';

type SafeAreaProps = PropsWithChildren<{
  background?: 'default' | 'surface';
}>;

function SafeArea({ children, background = 'default' }: SafeAreaProps) {
  return (
    <div
      style={{
        paddingTop: `calc(env(safe-area-inset-top) + ${spacingScale.lg}px)`,
        paddingRight: `calc(env(safe-area-inset-right) + ${spacingScale.lg}px)`,
        paddingBottom: `calc(env(safe-area-inset-bottom) + ${spacingScale.lg}px)`,
        paddingLeft: `calc(env(safe-area-inset-left) + ${spacingScale.lg}px)`,
        minHeight: '100vh',
        background: background === 'surface' ? 'var(--color-surface)' : 'var(--color-background)'
      }}
    >
      {children}
    </div>
  );
}

type ScreenProps = PropsWithChildren<{
  maxWidth?: number;
  gap?: keyof typeof spacingScale;
  align?: 'center' | 'stretch';
}>;

function Screen({ children, maxWidth = 1280, gap = 'xl', align = 'center' }: ScreenProps) {
  return (
    <main
      style={{
        margin: align === 'center' ? '0 auto' : undefined,
        width: '100%',
        maxWidth,
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacingScale[gap]}px`
      }}
    >
      {children}
    </main>
  );
}

export const Layout = { SafeArea, Screen };
