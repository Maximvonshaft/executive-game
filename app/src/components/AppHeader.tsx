import { PropsWithChildren } from 'react';
import { Surface } from './Surface';
import { Text } from './Text';
import { Button } from './Button';
import { SafeAreaInsets, UIScreen } from '../state/modules/uiSlice';
import { spacingScale } from '../theme/tokens';

type AppHeaderProps = PropsWithChildren<{
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  safeArea: SafeAreaInsets;
  currentScreen: UIScreen;
  onNavigate: (screen: UIScreen) => void;
  onToggleContrast: () => void;
  isHighContrast: boolean;
  sessionStatus: string;
  sessionUser?: { firstName?: string | null; lastName?: string | null; username?: string | null; rank?: string | null } | null;
  onLogout?: () => void;
  onResetOnboarding?: () => void;
}>;

export function AppHeader({
  orientation,
  aspectRatio,
  safeArea,
  currentScreen,
  onNavigate,
  onToggleContrast,
  isHighContrast,
  sessionStatus,
  sessionUser,
  onLogout,
  onResetOnboarding,
  children
}: AppHeaderProps) {
  const orientationLabel = orientation === 'landscape' ? '横屏' : '竖屏';
  const ratioLabel = aspectRatio.toFixed(2);
  const userDisplay = sessionUser
    ? `${sessionUser.firstName ?? ''} ${sessionUser.lastName ?? ''}`.trim() || sessionUser.username || '神秘玩家'
    : '游客';

  return (
    <Surface
      padding="md"
      radius="lg"
      elevation="raised"
      style={{
        display: 'grid',
        gap: spacingScale.md,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        position: 'sticky',
        top: safeArea.top,
        zIndex: 10,
        background: 'linear-gradient(135deg, rgba(26, 32, 54, 0.92), rgba(10, 14, 28, 0.92))',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Text variant="title" weight="bold">
          Executive Game 作战席
        </Text>
        <Text variant="caption" tone="muted">
          当前视图：{resolveScreenLabel(currentScreen)} · {orientationLabel} ({ratioLabel})
        </Text>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: spacingScale.sm,
          flexWrap: 'wrap'
        }}
      >
        <BadgeBlock label="安全区" value={`${Math.round(safeArea.left)} / ${Math.round(safeArea.right)} / ${Math.round(safeArea.bottom)} px`} />
        <BadgeBlock label="会话" value={sessionStatus === 'authenticated' ? '已登录' : '游客模式'} tone={sessionStatus === 'authenticated' ? 'positive' : 'caution'} />
        <BadgeBlock label="玩家" value={userDisplay} />
        <Button variant="outline" onClick={onToggleContrast}>
          {isHighContrast ? '标准对比度' : '高对比度'}
        </Button>
        {onResetOnboarding ? (
          <Button variant="ghost" onClick={onResetOnboarding}>
            重走引导
          </Button>
        ) : null}
        {sessionStatus === 'authenticated' && onLogout ? (
          <Button variant="ghost" onClick={onLogout}>
            退出
          </Button>
        ) : null}
        <Button variant="primary" onClick={() => onNavigate('lobby')}>
          返回大厅
        </Button>
      </div>
      {children}
    </Surface>
  );
}

type BadgeBlockProps = {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'caution';
};

function BadgeBlock({ label, value, tone = 'default' }: BadgeBlockProps) {
  const palette = {
    default: 'rgba(255, 255, 255, 0.18)',
    positive: 'rgba(42, 198, 130, 0.22)',
    caution: 'rgba(255, 196, 64, 0.22)'
  } as const;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 120,
        padding: '8px 12px',
        borderRadius: 12,
        background: palette[tone],
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body" weight="medium">
        {value}
      </Text>
    </div>
  );
}

function resolveScreenLabel(screen: UIScreen) {
  switch (screen) {
    case 'onboarding':
      return '新手引导';
    case 'lobby':
      return '大厅';
    case 'game':
      return '对战';
    case 'settings':
      return '设置';
    case 'leaderboard':
      return '排行榜';
    case 'shop':
      return '商城';
    case 'tutorial':
      return '教学关';
    default:
      return screen;
  }
}
