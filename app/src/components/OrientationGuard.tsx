import { Surface } from './Surface';
import { Text } from './Text';
import { Button } from './Button';

type OrientationGuardProps = {
  active: boolean;
  onContinue?: () => void;
  orientation: 'portrait' | 'landscape';
  recommended: 'landscape' | 'portrait';
};

export function OrientationGuard({ active, onContinue, orientation, recommended }: OrientationGuardProps) {
  if (!active) {
    return null;
  }

  const needsRotation = orientation !== recommended;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 12, 0.92)',
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
      }}
    >
      <Surface padding="xl" radius="xl" elevation="overlay" gap="lg" style={{ maxWidth: 420, textAlign: 'center' }}>
        <Text variant="title" weight="bold">
          请旋转到{recommended === 'landscape' ? '横屏' : '竖屏'}
        </Text>
        <Text variant="body" tone="muted">
          我们检测到当前设备为 {orientation === 'landscape' ? '横屏' : '竖屏'}。为了确保按钮落在双拇指安全区内、避免刘海遮挡，请切换到推荐的方向。
        </Text>
        <div
          style={{
            width: '100%',
            height: 160,
            borderRadius: 24,
            background:
              recommended === 'landscape'
                ? 'linear-gradient(135deg, rgba(80, 120, 255, 0.35), rgba(35, 222, 180, 0.35))'
                : 'linear-gradient(135deg, rgba(255, 172, 80, 0.35), rgba(255, 80, 120, 0.35))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text)',
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase'
          }}
        >
          ↻
        </div>
        <Text variant="caption" tone="muted">
          横屏安全区会自动读取系统 Safe Area / WindowInsets，避免动态岛、刘海、挖孔遮挡主要操作。
        </Text>
        {onContinue && !needsRotation ? (
          <Button variant="primary" onClick={onContinue}>
            我已调整，继续
          </Button>
        ) : null}
      </Surface>
    </div>
  );
}
