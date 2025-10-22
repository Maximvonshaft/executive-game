import { Button } from '../../components/Button';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';

export type NavigationView = 'lobby' | 'battle' | 'leaderboard' | 'settings' | 'store';

interface NavigationItem {
  id: NavigationView;
  label: string;
  description: string;
}

const items: NavigationItem[] = [
  { id: 'lobby', label: '大厅', description: '活动、任务、匹配入口' },
  { id: 'battle', label: '对战', description: 'Phaser 3 对战场景' },
  { id: 'leaderboard', label: '榜单', description: '总榜/地区榜/好友榜' },
  { id: 'settings', label: '设置', description: '账号、体验、音频' },
  { id: 'store', label: '商城', description: '赛季通行证与增值包体' }
];

interface AppNavigationProps {
  active: NavigationView;
  onNavigate: (view: NavigationView) => void;
}

export function AppNavigation({ active, onNavigate }: AppNavigationProps) {
  return (
    <Surface elevation="sunken" radius="xl" padding="md" style={{ display: 'flex', gap: 16, background: 'rgba(15,23,42,0.68)' }}>
      {items.map((item) => (
        <Button
          key={item.id}
          variant={item.id === active ? 'primary' : 'ghost'}
          onClick={() => onNavigate(item.id)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Text variant="body" weight="bold">
              {item.label}
            </Text>
            <Text variant="caption" tone="muted">
              {item.description}
            </Text>
          </div>
        </Button>
      ))}
    </Surface>
  );
}
