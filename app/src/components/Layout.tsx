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
}>;

function Screen({ children, maxWidth = 480 }: ScreenProps) {
  return (
    <main
      style={{
        margin: '0 auto',
        width: '100%',
        maxWidth,
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacingScale.lg}px`
      }}
    >
      {children}
    </main>
  );
}

export const Layout = { SafeArea, Screen };
