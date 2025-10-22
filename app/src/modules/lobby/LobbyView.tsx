import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { getHUDConfig, type GameDiscipline } from '../battle/gameConfigs';

interface LobbyViewProps {
  onEnterBattle: (discipline: GameDiscipline) => void;
  onPreviewDiscipline: (discipline: GameDiscipline) => void;
  selectedDiscipline: GameDiscipline;
}

const lobbyGames: { id: GameDiscipline; cover: string; estimated: string; safeAreaNote: string }[] = [
  {
    id: 'texas',
    cover: '量子德扑',
    estimated: '匹配耗时 < 8s',
    safeAreaNote: '双拇指绿区已适配 19.5:9 / 16:9'
  },
  {
    id: 'doudizhu',
    cover: '极光斗地主',
    estimated: '匹配耗时 < 5s',
    safeAreaNote: '托管与断线重连即时恢复'
  },
  {
    id: 'xiangqi',
    cover: '玉麟象棋',
    estimated: '排位 + 人机随时切换',
    safeAreaNote: '禁手与数子逻辑已内置'
  }
];

const quickTasks = [
  { id: 'daily', title: '每日签到', reward: '+100 赛季点', description: '登录 + 完成一局即可领取。' },
  { id: 'sprint', title: '冲刺任务', reward: '限定入场特效', description: '德扑赢下 3 场 All-in。' },
  { id: 'growth', title: '成长任务', reward: '赛季经验 +200', description: '完成新手教程并邀请好友。' }
];

const botConfigs = [
  { difficulty: '自适应', description: '根据历史表现动态匹配，防止排队超时。' },
  { difficulty: '专业', description: '德扑/斗地主提供 GTO 建议，象棋提供定制棋谱。' },
  { difficulty: '合作训练', description: '支持战队房间内共享视角复盘。' }
];

export function LobbyView({ onEnterBattle, onPreviewDiscipline, selectedDiscipline }: LobbyViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Surface elevation="raised" radius="xl" padding="lg" gap="lg" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="title" weight="bold">
          大厅精选玩法
        </Text>
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {lobbyGames.map((game) => {
            const config = getHUDConfig(game.id);
            const active = game.id === selectedDiscipline;
            return (
              <Surface
                key={game.id}
                elevation={active ? 'raised' : 'sunken'}
                radius="lg"
                padding="md"
                gap="md"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, rgba(56,189,248,0.45), rgba(59,130,246,0.35))'
                    : 'rgba(15,23,42,0.45)',
                  border: active ? '1px solid rgba(96,165,250,0.8)' : '1px solid rgba(148,163,184,0.2)'
                }}
              >
                <Text variant="body" weight="bold">
                  {game.cover}
                </Text>
                <Text variant="caption" tone="muted">
                  {config.description}
                </Text>
                <Text variant="caption" tone="muted">
                  {game.estimated}
                </Text>
                <Text variant="caption" tone="muted">
                  {game.safeAreaNote}
                </Text>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button variant="outline" onClick={() => onPreviewDiscipline(game.id)}>
                    查看 HUD 布局
                  </Button>
                  <Button onClick={() => onEnterBattle(game.id)}>进入牌桌</Button>
                </div>
              </Surface>
            );
          })}
        </div>
      </Surface>

      <Surface elevation="sunken" radius="xl" padding="lg" gap="lg" style={{ background: 'rgba(15,23,42,0.6)' }}>
        <Text variant="body" weight="bold">
          新手保护 · 人机托底
        </Text>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {botConfigs.map((bot) => (
            <Surface key={bot.difficulty} elevation="sunken" radius="lg" padding="md" style={{ width: 260 }}>
              <Text variant="body" weight="bold">
                {bot.difficulty}
              </Text>
              <Text variant="caption" tone="muted">
                {bot.description}
              </Text>
            </Surface>
          ))}
        </div>
      </Surface>

      <Surface elevation="sunken" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(30,41,59,0.62)' }}>
        <Text variant="body" weight="bold">
          活动与任务
        </Text>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {quickTasks.map((task) => (
            <Surface key={task.id} elevation="sunken" radius="lg" padding="md" style={{ width: 260 }}>
              <Text variant="body" weight="bold">
                {task.title}
              </Text>
              <Text variant="caption" tone="muted">
                {task.description}
              </Text>
              <Text variant="caption" tone="positive">
                {task.reward}
              </Text>
            </Surface>
          ))}
        </div>
      </Surface>
    </div>
  );
}
