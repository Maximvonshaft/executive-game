import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { gameCatalog } from '../constants/gameCatalog';
import { spacingScale } from '../theme/tokens';

export function TutorialScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <Surface padding="xl" radius="xl" elevation="raised" gap="lg">
      <Text variant="title" weight="bold">
        教学关卡与回放
      </Text>
      <Text variant="body" tone="muted">
        每款玩法提供 L1-L5 动效演示，低端机自动降级。支持关键回合书签、镜头跳转与复盘点评。
      </Text>
      <div style={{ display: 'grid', gap: spacingScale.md }}>
        {gameCatalog.map((game) => (
          <Surface key={game.id} padding="md" radius="lg" elevation="sunken" gap="sm">
            <Text variant="body" weight="bold">
              {game.name}
            </Text>
            <Text variant="caption" tone="muted">
              教程要点
            </Text>
            <ol style={{ margin: 0, paddingLeft: 22 }}>
              {game.tutorial.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </Surface>
        ))}
      </div>
      <Button variant="outline" onClick={onReturn}>
        返回大厅
      </Button>
    </Surface>
  );
}
