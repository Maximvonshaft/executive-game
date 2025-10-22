import { useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  delta: number;
  region: string;
}

const globalEntries: LeaderboardEntry[] = [
  { rank: 1, nickname: 'AuroraNova', score: 32840, delta: +320, region: '全球' },
  { rank: 2, nickname: 'QuantumSeven', score: 31220, delta: +180, region: '全球' },
  { rank: 3, nickname: 'BladeRiver', score: 30980, delta: -40, region: '全球' }
];

const regionalEntries: LeaderboardEntry[] = [
  { rank: 1, nickname: '霓虹大熊', score: 18840, delta: +120, region: '华北' },
  { rank: 2, nickname: '星港占星师', score: 18660, delta: +60, region: '华南' },
  { rank: 3, nickname: '晨星女王', score: 18040, delta: +240, region: '华东' }
];

const friendEntries: LeaderboardEntry[] = [
  { rank: 1, nickname: '战队·北极光', score: 16480, delta: +90, region: '战队' },
  { rank: 2, nickname: '战队·断线重连', score: 15360, delta: +60, region: '战队' },
  { rank: 3, nickname: '战队·星火', score: 15080, delta: -20, region: '战队' }
];

const tabs = [
  { id: 'global', label: '总榜', data: globalEntries },
  { id: 'regional', label: '地区榜', data: regionalEntries },
  { id: 'friend', label: '好友/战队榜', data: friendEntries }
] as const;

type TabId = (typeof tabs)[number]['id'];

export function LeaderboardView() {
  const [activeTab, setActiveTab] = useState<TabId>('global');

  const dataset = tabs.find((tab) => tab.id === activeTab)?.data ?? globalEntries;

  return (
    <Surface elevation="raised" radius="xl" padding="lg" gap="lg" style={{ background: 'rgba(15,23,42,0.72)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" weight="bold">
          段位排行与赛季进度
        </Text>
        <div style={{ display: 'flex', gap: 12 }}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={tab.id === activeTab ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <Surface elevation="sunken" radius="lg" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
        {dataset.map((entry) => (
          <Surface
            key={`${activeTab}-${entry.rank}`}
            elevation="sunken"
            radius="md"
            padding="sm"
            style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px', alignItems: 'center' }}
          >
            <Text variant="body" weight="bold">
              #{entry.rank}
            </Text>
            <Text variant="body" tone="muted">
              {entry.nickname}
            </Text>
            <Text variant="body" weight="bold">
              {entry.score.toLocaleString()}
            </Text>
            <Text variant="caption" tone={entry.delta >= 0 ? 'positive' : 'critical'}>
              {entry.delta >= 0 ? '+' : ''}
              {entry.delta} pts
            </Text>
          </Surface>
        ))}
      </Surface>

      <Surface elevation="sunken" radius="lg" padding="lg" gap="md" style={{ background: 'rgba(56,189,248,0.12)' }}>
        <Text variant="body" weight="bold">
          赛季结算提示
        </Text>
        <Text variant="caption" tone="muted">
          * 赛季结算动画属于 L5 主题级演出，自动降级策略：低端机改为 L3 缩短时间轴。
        </Text>
        <Text variant="caption" tone="muted">
          * 反刷屏蔽：弃权场次会扣除 Elo 下限，并降低跨季奖励上限。
        </Text>
      </Surface>
    </Surface>
  );
}
