import { UIScreen } from '../state/modules/uiSlice';
import { Button } from './Button';
import { Surface } from './Surface';
import { Text } from './Text';
import { spacingScale } from '../theme/tokens';

type PrimaryNavigationProps = {
  currentScreen: UIScreen;
  onNavigate: (screen: UIScreen) => void;
  onOpenTutorial: () => void;
  disabled?: boolean;
  orientation: 'portrait' | 'landscape';
};

const navItems: { id: UIScreen; label: string; description: string }[] = [
  { id: 'lobby', label: '大厅', description: '匹配 / 活动' },
  { id: 'leaderboard', label: '排行', description: '地区 / 赛季' },
  { id: 'shop', label: '商城', description: '通行证 / 活动' },
  { id: 'settings', label: '设置', description: '控制台 / 辅助' }
];

export function PrimaryNavigation({ currentScreen, onNavigate, onOpenTutorial, disabled, orientation }: PrimaryNavigationProps) {
  return (
    <Surface
      padding="sm"
      radius="xl"
      elevation="raised"
      style={{
        position: 'sticky',
        bottom: `calc(${orientation === 'landscape' ? 'env(safe-area-inset-bottom)' : 'env(safe-area-inset-bottom)'} + 12px)`,
        display: 'grid',
        gridTemplateColumns: orientation === 'landscape' ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
        gap: spacingScale.sm,
        background: 'rgba(18, 22, 36, 0.9)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(90,110,255,0.24)'
      }}
    >
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          disabled={disabled}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 2,
            padding: '12px 16px',
            borderRadius: 16,
            border: item.id === currentScreen ? '1px solid rgba(167, 219, 255, 0.65)' : '1px solid transparent',
            background:
              item.id === currentScreen
                ? 'linear-gradient(135deg, rgba(54, 86, 255, 0.35), rgba(164, 75, 255, 0.35))'
                : 'rgba(20, 26, 38, 0.6)',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'transform 160ms ease, background 160ms ease',
            fontFamily: 'inherit'
          }}
        >
          <Text variant="body" weight="bold">
            {item.label}
          </Text>
          <Text variant="caption" tone="muted">
            {item.description}
          </Text>
        </button>
      ))}
      <Button variant="outline" onClick={onOpenTutorial} disabled={disabled}>
        教学 &amp; 回放
      </Button>
    </Surface>
  );
}
