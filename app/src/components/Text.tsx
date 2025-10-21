import { PropsWithChildren } from 'react';
import { typographyScale, TypographyVariant } from '../theme/tokens';

type TextProps = PropsWithChildren<{
  variant?: TypographyVariant;
  weight?: 'regular' | 'medium' | 'bold';
  tone?: 'default' | 'muted' | 'positive' | 'caution' | 'critical';
  align?: 'left' | 'center' | 'right';
}>;

const weightMap = {
  regular: 400,
  medium: 600,
  bold: 700
};

const toneColor: Record<NonNullable<TextProps['tone']>, string> = {
  default: 'var(--color-text)',
  muted: 'var(--color-textMuted)',
  positive: 'var(--color-positive)',
  caution: 'var(--color-caution)',
  critical: 'var(--color-critical)'
};

export function Text({
  children,
  variant = 'body',
  weight = 'regular',
  tone = 'default',
  align = 'left'
}: TextProps) {
  const tokens = typographyScale[variant];
  return (
    <span
      style={{
        display: 'block',
        fontSize: `${tokens.fontSize}px`,
        lineHeight: `${tokens.lineHeight}px`,
        letterSpacing: `${tokens.letterSpacing}em`,
        fontWeight: weightMap[weight],
        color: toneColor[tone],
        textAlign: align
      }}
    >
      {children}
    </span>
  );
}
