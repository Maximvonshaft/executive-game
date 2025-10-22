import { Banner } from '../state/modules/announcementSlice';
import { Task } from '../state/modules/taskSlice';
import { LeaderboardEntry } from '../state/modules/leaderboardSlice';
import { GameDefinition } from '../constants/gameCatalog';
import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { spacingScale } from '../theme/tokens';

export type LobbyScreenProps = {
  games: GameDefinition[];
  banners: Banner[];
  tasks: Task[];
  leaderboard: LeaderboardEntry[];
  onSelectGame: (id: string) => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
};

export function LobbyScreen({
  games,
  banners,
  tasks,
  leaderboard,
  onSelectGame,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenShop
}: LobbyScreenProps) {
  return (
    <div style={{ display: 'grid', gap: spacingScale.xl }}>
      <Hero banners={banners} onOpenShop={onOpenShop} />
      <GameGrid games={games} onSelectGame={onSelectGame} />
      <DailyTasks tasks={tasks} />
      <LeaderboardPreview entries={leaderboard} onOpenLeaderboard={onOpenLeaderboard} />
      <ControlRoom onOpenSettings={onOpenSettings} />
    </div>
  );
}

function Hero({ banners, onOpenShop }: { banners: Banner[]; onOpenShop: () => void }) {
  const banner = banners[0];
  return (
    <Surface padding="xl" radius="xl" elevation="raised" gap="md" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: banner?.imageUrl
            ? `linear-gradient(135deg, rgba(10,10,18,0.65), rgba(10,10,18,0.85)), url(${banner.imageUrl}) center/cover`
            : 'linear-gradient(135deg, rgba(44, 88, 255, 0.65), rgba(20, 18, 42, 0.95))',
          filter: 'blur(0px)',
          opacity: 0.9,
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
        <Text variant="title" weight="bold">
          立即开局 · 专业 HUD &amp; Safe Area 调度
        </Text>
        <Text variant="body" tone="muted">
          19.5:9 / 16:9 双布局，自适应刘海、挖孔和动态岛。匹配失败自动接入 AI 托底。
        </Text>
        <div style={{ display: 'flex', gap: spacingScale.sm, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={onOpenShop}>
            查看赛季通行证
          </Button>
          <Button variant="outline" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
            浏览全部游戏
          </Button>
        </div>
        {banner ? (
          <Surface padding="md" radius="lg" elevation="sunken" gap="sm" style={{ maxWidth: 480 }}>
            <Text variant="body" weight="medium">
              {banner.title}
            </Text>
            <Text variant="caption" tone="muted">
              {banner.body}
            </Text>
          </Surface>
        ) : null}
      </div>
    </Surface>
  );
}

function GameGrid({ games, onSelectGame }: { games: GameDefinition[]; onSelectGame: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: spacingScale.lg }}>
      <Text variant="title" weight="bold">
        多玩法 · 统一 HUD 动线
      </Text>
      <div style={{ display: 'grid', gap: spacingScale.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {games.map((game) => (
          <Surface key={game.id} padding="md" radius="xl" elevation="raised" gap="md" style={{ overflow: 'hidden' }}>
            <div
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                position: 'relative',
                height: 160
              }}
            >
              <img src={game.cover} alt={`${game.name} 封面`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.65))'
                }}
              />
              <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text variant="body" weight="bold">
                  {game.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {game.tagline}
                </Text>
              </div>
            </div>
            <Text variant="caption" tone="muted">
              {game.minPlayers} - {game.maxPlayers} 人 · {game.actions.join(' / ')}
            </Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {game.features.map((feature) => (
                <li key={feature} style={{ marginBottom: 4 }}>
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="primary" onClick={() => onSelectGame(game.id)}>
              进入牌桌
            </Button>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function DailyTasks({ tasks }: { tasks: Task[] }) {
  return (
    <Surface padding="lg" radius="lg" elevation="sunken" gap="md">
      <Text variant="title" weight="bold">
        活动任务 · 连续登录奖励
      </Text>
      <div style={{ display: 'grid', gap: spacingScale.md }}>
        {tasks.slice(0, 4).map((task) => {
          const progress = Math.min(1, task.progress / task.goal);
          return (
            <div key={task.id} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body" weight="medium">
                  {task.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {Math.round(progress * 100)}%
                </Text>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: task.completed ? 'linear-gradient(90deg, #4fd1c5, #63b3ed)' : 'linear-gradient(90deg, #805ad5, #f6ad55)',
                    transition: 'width 320ms ease'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function LeaderboardPreview({ entries, onOpenLeaderboard }: { entries: LeaderboardEntry[]; onOpenLeaderboard: () => void }) {
  return (
    <Surface padding="lg" radius="lg" elevation="raised" gap="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" weight="bold">
          高手榜 · 地区 / 全服
        </Text>
        <Button variant="outline" onClick={onOpenLeaderboard}>
          查看全部
        </Button>
      </div>
      <div style={{ display: 'grid', gap: spacingScale.sm }}>
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry.playerId}
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr auto',
              alignItems: 'center',
              gap: spacingScale.sm,
              padding: '8px 12px',
              borderRadius: 16,
              background: 'rgba(15, 20, 36, 0.6)'
            }}
          >
            <Text variant="body" weight="bold">
              #{entry.rank}
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text variant="body" weight="medium">
                {entry.playerId}
              </Text>
              <Text variant="caption" tone="muted">
                胜率 {Math.round(entry.winRate * 100)}% · 段位 {entry.tier}
              </Text>
            </div>
            <Text variant="body" weight="bold">
              {entry.rating}
            </Text>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function ControlRoom({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Surface padding="lg" radius="lg" elevation="sunken" gap="md">
      <Text variant="title" weight="bold">
        控制台 &amp; 辅助功能
      </Text>
      <Text variant="body" tone="muted">
        设置画质 / 帧率、特效强度、震动、左手模式、色弱模式、字体大小与多语言。还支持语音降噪、数据导出、账户隐私等。
      </Text>
      <Button variant="outline" onClick={onOpenSettings}>
        打开设置
      </Button>
    </Surface>
  );
}
