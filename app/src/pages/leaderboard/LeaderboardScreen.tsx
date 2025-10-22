import { useMemo, useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { useOrientation } from '../../hooks/useOrientation';
import { spacingScale } from '../../theme/tokens';

type LeaderboardScreenProps = {
  onClose: () => void;
};

type TabKey = 'global' | 'regional' | 'friends';

type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  avatarUrl: string;
  rating: number;
  streak: number;
  region: string;
};

const badgeUrls = {
  champion: 'https://cdn.pixabay.com/photo/2017/03/25/17/55/trophy-2178743_1280.png',
  challenger: 'https://cdn.pixabay.com/photo/2016/03/31/19/56/wings-1295396_1280.png'
};

const mockEntries: Record<TabKey, LeaderboardEntry[]> = {
  global: [
    {
      id: '1',
      rank: 1,
      name: '星辉·Nova',
      avatarUrl: 'https://cdn.pixabay.com/photo/2016/11/19/14/00/beautiful-1836472_1280.jpg',
      rating: 2586,
      streak: 9,
      region: '全球'
    },
    {
      id: '2',
      rank: 2,
      name: 'AI·Gaia',
      avatarUrl: 'https://cdn.pixabay.com/photo/2020/10/26/02/43/cyberpunk-5680435_1280.jpg',
      rating: 2480,
      streak: 6,
      region: '全球'
    },
    {
      id: '3',
      rank: 3,
      name: '北落师门',
      avatarUrl: 'https://cdn.pixabay.com/photo/2016/06/06/22/14/man-1449346_1280.jpg',
      rating: 2456,
      streak: 5,
      region: '全球'
    }
  ],
  regional: [
    {
      id: 'cn1',
      rank: 1,
      name: '战歌',
      avatarUrl: 'https://cdn.pixabay.com/photo/2016/11/29/09/08/woman-1868772_1280.jpg',
      rating: 2320,
      streak: 4,
      region: '华南'
    },
    {
      id: 'cn2',
      rank: 2,
      name: '霜狼',
      avatarUrl: 'https://cdn.pixabay.com/photo/2020/06/25/18/23/man-5333691_1280.jpg',
      rating: 2298,
      streak: 3,
      region: '华北'
    },
    {
      id: 'cn3',
      rank: 3,
      name: '星界侦探',
      avatarUrl: 'https://cdn.pixabay.com/photo/2017/01/24/08/55/astronaut-2005693_1280.jpg',
      rating: 2250,
      streak: 2,
      region: '华东'
    }
  ],
  friends: [
    {
      id: 'f1',
      rank: 1,
      name: '你',
      avatarUrl: 'https://cdn.pixabay.com/photo/2016/03/27/07/08/fashion-1283863_1280.jpg',
      rating: 2210,
      streak: 3,
      region: '好友'
    },
    {
      id: 'f2',
      rank: 2,
      name: '南星',
      avatarUrl: 'https://cdn.pixabay.com/photo/2019/03/15/13/54/woman-4056215_1280.jpg',
      rating: 2150,
      streak: 2,
      region: '好友'
    },
    {
      id: 'f3',
      rank: 3,
      name: '光速少年',
      avatarUrl: 'https://cdn.pixabay.com/photo/2016/11/21/14/27/man-1845814_1280.jpg',
      rating: 2104,
      streak: 1,
      region: '好友'
    }
  ]
};

export function LeaderboardScreen({ onClose }: LeaderboardScreenProps) {
  const insets = useSafeAreaInsets();
  const orientation = useOrientation();
  const [activeTab, setActiveTab] = useState<TabKey>('global');

  const entries = useMemo(() => mockEntries[activeTab], [activeTab]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacingScale.lg,
        padding: `${spacingScale.lg + insets.top}px ${spacingScale.lg + insets.right}px ${spacingScale.lg + insets.bottom}px ${spacingScale.lg + insets.left}px`
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.xs }}>
          <Text variant="headline" weight="bold">
            排行榜 · S13 赛季
          </Text>
          <Text variant="caption" tone="muted">
            赛季结算倒计时 08 天 14:22 · 段位晋升奖励包含主题级演出
          </Text>
        </div>
        <Button variant="outline" onClick={onClose}>
          返回
        </Button>
      </header>

      <Surface
        padding="lg"
        elevation="raised"
        radius="lg"
        className="neon-border"
        style={{ display: 'flex', flexDirection: orientation === 'portrait' ? 'column' : 'row', gap: spacingScale.lg, borderRadius: 28 }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacingScale.md }}>
          <Text variant="subtitle" weight="bold">
            Tab 切换
          </Text>
          <div style={{ display: 'flex', gap: spacingScale.sm, flexWrap: 'wrap' }}>
            <Button variant={activeTab === 'global' ? 'primary' : 'outline'} onClick={() => setActiveTab('global')}>
              总榜
            </Button>
            <Button variant={activeTab === 'regional' ? 'primary' : 'outline'} onClick={() => setActiveTab('regional')}>
              地区榜
            </Button>
            <Button variant={activeTab === 'friends' ? 'primary' : 'outline'} onClick={() => setActiveTab('friends')}>
              好友榜
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacingScale.md }}>
          <img src={badgeUrls.champion} alt="冠军徽章" style={{ width: 72, height: 72 }} />
          <Text variant="body" tone="muted">
            全局随机种子可审计 · 防合谋风控上线
          </Text>
        </div>
      </Surface>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: spacingScale.lg
        }}
      >
        {entries.map((entry) => (
          <Surface
            key={entry.id}
            padding="lg"
            elevation="raised"
            radius="lg"
            className="neon-border"
            style={{ display: 'flex', gap: spacingScale.md, alignItems: 'center', borderRadius: 24 }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={entry.avatarUrl}
                alt={entry.name}
                style={{ width: 84, height: 84, borderRadius: 24, objectFit: 'cover' }}
              />
              {entry.rank === 1 ? (
                <img
                  src={badgeUrls.challenger}
                  alt="段位徽章"
                  style={{ position: 'absolute', bottom: -12, right: -12, width: 48, height: 48 }}
                />
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.xs }}>
              <Text variant="body" weight="bold">
                #{entry.rank} {entry.name}
              </Text>
              <Text variant="caption" tone="muted">
                Elo {entry.rating} · 连胜 {entry.streak}
              </Text>
              <Text variant="caption" tone="muted">
                区域：{entry.region}
              </Text>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
