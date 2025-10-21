import { HTMLAttributes, PropsWithChildren } from 'react';
import { ElevationToken, RadiusToken, SpacingToken, elevationShadow, radiusScale, spacingScale } from '../theme/tokens';

type SurfaceProps = PropsWithChildren<{
  padding?: SpacingToken;
  gap?: SpacingToken;
  elevation?: ElevationToken;
  radius?: RadiusToken;
  role?: 'group' | 'region';
}> & HTMLAttributes<HTMLElement>;

export function Surface({
  children,
  padding = 'lg',
  gap = 'md',
  elevation = 'resting',
  radius = 'lg',
  role,
  ...rest
}: SurfaceProps) {
  return (
    <section
      role={role}
      {...rest}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacingScale[gap]}px`,
        padding: `${spacingScale[padding]}px`,
        background: 'var(--color-surface)',
        borderRadius: `${radiusScale[radius]}px`,
        boxShadow: elevationShadow[elevation],
        border: '1px solid var(--color-border)'
      }}
    >
      {children}
    </section>
  );
}
