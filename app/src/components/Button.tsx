import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { motionTokens, radiusScale, spacingScale } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const sizeTokens: Record<ButtonSize, { height: number; paddingX: number; textSize: number }> = {
  sm: { height: 44, paddingX: 12, textSize: 14 },
  md: { height: 48, paddingX: 16, textSize: 16 },
  lg: { height: 56, paddingX: 20, textSize: 18 }
};

const variantTokens: Record<ButtonVariant, { background: string; color: string; border: string; hover: string }> = {
  primary: {
    background: 'linear-gradient(135deg, var(--color-primaryStrong), var(--color-primary))',
    color: 'var(--color-background)',
    border: '1px solid var(--color-primaryStrong)',
    hover: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
  },
  secondary: {
    background: 'var(--color-surfaceMuted)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    hover: 'var(--color-surface)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    hover: 'rgba(245, 196, 81, 0.1)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-textMuted)',
    border: '1px solid transparent',
    hover: 'rgba(245, 196, 81, 0.16)'
  }
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  accessibilityLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    disabled,
    accessibilityLabel,
    ...rest
  },
  ref
) {
  const tokens = sizeTokens[size];
  const variantStyles = variantTokens[variant];
  return (
    <button
      ref={ref}
      aria-label={accessibilityLabel}
      disabled={disabled}
      {...rest}
      style={{
        minHeight: `${tokens.height}px`,
        minWidth: 44,
        padding: `0 ${tokens.paddingX}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${spacingScale.sm}px`,
        fontSize: `${tokens.textSize}px`,
        fontWeight: 600,
        borderRadius: `${radiusScale.lg}px`,
        border: variantStyles.border,
        background: variantStyles.background,
        color: variantStyles.color,
        transition: `background ${motionTokens.durationShort} ${motionTokens.easingStandard}, transform ${motionTokens.durationShort} ${motionTokens.easingStandard}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
      onMouseDown={(event) => {
        rest.onMouseDown?.(event);
        if (!disabled) {
          (event.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
        }
      }}
      onMouseUp={(event) => {
        rest.onMouseUp?.(event);
        (event.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseEnter={(event) => {
        rest.onMouseEnter?.(event);
        if (!disabled) {
          (event.currentTarget as HTMLButtonElement).style.background = variantStyles.hover;
        }
      }}
      onMouseLeave={(event) => {
        rest.onMouseLeave?.(event);
        const target = event.currentTarget as HTMLButtonElement;
        target.style.transform = 'scale(1)';
        target.style.background = variantStyles.background;
      }}
    >
      {leadingIcon}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${spacingScale.xs}px` }}>{children}</span>
      {trailingIcon}
    </button>
  );
});
