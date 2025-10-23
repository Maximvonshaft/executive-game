import { ReactNode, useMemo } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useOrientation } from '../../hooks/useOrientation';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { spacingScale } from '../../theme/tokens';
import { useGlobalStore } from '../../state/globalStore';

type LobbyScreenProps = {
  onEnterMatch: (mode: MatchMode) => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onOpenStore: () => void;
  onOpenBattlePass: () => void;
};

export type MatchMode = 'doudizhu-ranked' | 'texas-sng' | 'xiangqi-duel';

type LobbyTile = {
  id: MatchMode;
  title: string;
  description: string;
  coverUrl: string;
  badge?: ReactNode;
  recommendations: string[];
};

const tiles: LobbyTile[] = [
  {
    id: 'doudizhu-ranked',
    title: '斗地主 · 星耀排位',
    description: '实时断线重连、叫/抢地主动态演出，支持 Time Bank 补时与高级托管。',
    coverUrl: 'https://cdn.pixabay.com/photo/2015/05/29/16/25/poker-789696_1280.jpg',
    badge: <Text variant="caption" tone="positive">S13 赛季·加倍卡掉率 +20%</Text>,
    recommendations: ['低延迟服务器自动分配', '连胜加成 ×2', '炸弹演算实时展示']
  },
  {
    id: 'texas-sng',
    title: '德州扑克 · SNG 快赛',
    description: '筹码池 / 边池智能结算，All-in 粒子特效，HUD 支持左手模式。',
    coverUrl: 'https://cdn.pixabay.com/photo/2016/03/27/18/10/poker-1282163_1280.jpg',
    badge: <Text variant="caption" tone="caution">全新：自定义盲注结构</Text>,
    recommendations: ['边池计算校验可回放', 'Time Bank ×60s', '关键回合书签回放']
  },
  {
    id: 'xiangqi-duel',
    title: '象棋 · 竞技对局',
    description: '禁手提示、落子粒子化光轨、战局复盘与谱例库集成。',
    coverUrl: 'https://cdn.pixabay.com/photo/2015/02/25/08/16/chinese-chess-648659_1280.jpg',
    badge: <Text variant="caption" tone="positive">支持好友 / 战队内战</Text>,
    recommendations: ['残局库实时引用', '色弱模式高对比棋盘', '悔棋仅限友谊赛']
  }
];

export function LobbyScreen({
  onEnterMatch,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenStore,
  onOpenBattlePass
}: LobbyScreenProps) {
  const orientation = useOrientation();
  const insets = useSafeAreaInsets();
  const sessionUser = useGlobalStore((state) => state.session.user);
  const profile = useGlobalStore((state) => state.player.profile);
  const operationalAnnouncements = useGlobalStore((state) => state.banners.items ?? []);

  const preferredAvatar = useMemo(() => {
    if (profile?.identity?.avatarUrl) {
      return profile.identity.avatarUrl;
    }
    return 'https://cdn.pixabay.com/photo/2016/03/31/19/56/avatar-1295393_1280.png';
  }, [profile]);

  const lobbyColumns = orientation === 'portrait' ? 1 : 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacingScale.lg,
        padding: `${spacingScale.lg + insets.top}px ${spacingScale.lg + insets.right}px ${spacingScale.lg + insets.bottom}px ${spacingScale.lg + insets.left}px`
      }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'auto 1fr auto',
          alignItems: 'center',
          gap: spacingScale.lg
        }}
      >
        <Surface
          padding="md"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', alignItems: 'center', gap: spacingScale.md, borderRadius: 28 }}
        >
          <img
            src={preferredAvatar}
            alt="玩家头像"
            style={{
              width: 72,
              height: 72,
              borderRadius: '24px',
              objectFit: 'cover',
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text variant="subtitle" weight="bold">
              {sessionUser?.firstName ? `${sessionUser.firstName} ${sessionUser.lastName ?? ''}` : '游客'}
            </Text>
            <Text variant="caption" tone="muted">
              段位：{profile?.tier ?? '未定级'} · Elo {profile?.rating ?? 1200}
            </Text>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Text variant="caption" tone="positive">连胜 {profile?.stats.winStreak ?? 0}</Text>
              <Text variant="caption" tone="muted">胜率 {profile ? Math.round((profile.stats.wins / Math.max(profile.stats.totalMatches || 1, 1)) * 100) : 50}%</Text>
            </div>
          </div>
        </Surface>
        <div
          style={{
            display: 'grid',
            gap: spacingScale.md,
            gridTemplateColumns: orientation === 'portrait' ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(3, minmax(0, 1fr))'
          }}
        >
          <Surface padding="md" elevation="sunken" radius="lg" className="neon-border">
            <Text variant="caption" tone="muted">每日任务</Text>
            <Text variant="body" weight="medium">完成 3 场排位赛</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: '66%', height: '100%', background: 'linear-gradient(90deg, rgba(100,255,218,0.9), rgba(61,90,254,0.9))' }} />
              </div>
              <Text variant="caption" weight="medium">2 / 3</Text>
            </div>
          </Surface>
          <Surface padding="md" elevation="sunken" radius="lg" className="neon-border">
            <Text variant="caption" tone="muted">赛季通行证</Text>
            <Text variant="body" weight="medium">距离下一级：920 EXP</Text>
            <Button variant="outline" size="sm" onClick={onOpenBattlePass}>
              查看奖励
            </Button>
          </Surface>
          <Surface padding="md" elevation="sunken" radius="lg" className="neon-border">
            <Text variant="caption" tone="muted">弱网络补偿</Text>
            <Text variant="body" weight="medium">离线代打可用</Text>
            <Text variant="caption" tone="positive">断线 3 次以内可免 MMR 扣分</Text>
          </Surface>
        </div>
        {orientation === 'landscape' ? (
          <Button variant="outline" onClick={onOpenSettings}>
            设置
          </Button>
        ) : null}
      </header>

      <section
        style={{
          display: 'grid',
          gap: spacingScale.lg,
          gridTemplateColumns: `repeat(${lobbyColumns}, minmax(0, 1fr))`
        }}
      >
        {tiles.map((tile) => (
          <Surface
            key={tile.id}
            padding="lg"
            gap="md"
            elevation="raised"
            radius="lg"
            className="neon-border"
            style={{
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: `linear-gradient(180deg, rgba(4,9,22,0.3), rgba(4,9,22,0.95)), url(${tile.coverUrl})`,
              backgroundSize: 'cover',
              minHeight: 320,
              display: 'flex',
              borderRadius: 32
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 60%)',
                pointerEvents: 'none'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="subtitle" weight="bold">
                    {tile.title}
                  </Text>
                  {tile.badge}
                </div>
                <Text variant="body" tone="muted">
                  {tile.description}
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text variant="caption" tone="muted">
                  推荐配置
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tile.recommendations.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(100,255,218,0.85)' }} />
                      <Text variant="caption" tone="muted">
                        {item}
                      </Text>
                    </div>
                  ))}
                </div>
                <Button onClick={() => onEnterMatch(tile.id)}>
                  {tile.id === 'doudizhu-ranked' ? '进入排位赛' : '加入赛桌'}
                </Button>
              </div>
            </div>
          </Surface>
        ))}
      </section>

      <section style={{ display: 'grid', gap: spacingScale.lg, gridTemplateColumns: orientation === 'portrait' ? '1fr' : '2fr 1fr' }}>
        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">实时运营公告</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm, maxHeight: 220, overflowY: 'auto' }}>
            {operationalAnnouncements.length > 0 ? (
              operationalAnnouncements.map((announcement) => (
                <Surface
                  key={announcement.id}
                  padding="md"
                  elevation="sunken"
                  radius="lg"
                  style={{ background: 'rgba(12,21,38,0.8)' }}
                >
                  <Text variant="body" weight="medium">
                    {announcement.title}
                  </Text>
                  {announcement.body ? (
                    <Text variant="caption" tone="muted">
                      {announcement.body}
                    </Text>
                  ) : null}
                </Surface>
              ))
            ) : (
              <Text variant="caption" tone="muted">
                暂无公告，敬请期待赛季动态。
              </Text>
            )}
          </div>
        </Surface>
        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">快捷导航</Text>
          <Button variant="outline" onClick={onOpenLeaderboard}>
            查看排行榜
          </Button>
          <Button variant="outline" onClick={onOpenStore}>
            进入商城
          </Button>
          <Button variant="outline" onClick={onOpenSettings}>
            设置与个性化
          </Button>
        </Surface>
      </section>
    </div>
  );
}
