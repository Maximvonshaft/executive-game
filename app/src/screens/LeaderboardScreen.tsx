import { useMemo } from 'react';
import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { LeaderboardEntry, LeaderboardScope } from '../state/modules/leaderboardSlice';
import { spacingScale } from '../theme/tokens';

export type LeaderboardScreenProps = {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  generatedAt: number | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  onScopeChange: (scope: LeaderboardScope) => void;
  onRefresh: () => void;
};

const scopeLabels: Record<LeaderboardScope, string> = {
  overall: '总榜',
  weekly: '地区榜',
  monthly: '赛季榜'
};

export function LeaderboardScreen({ scope, entries, generatedAt, status, error, onScopeChange, onRefresh }: LeaderboardScreenProps) {
  const timestamp = useMemo(() => {
    if (!generatedAt) {
      return '尚未生成';
    }
    const date = new Date(generatedAt);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }, [generatedAt]);

  return (
    <Surface padding="xl" radius="xl" elevation="raised" gap="xl">
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: spacingScale.sm, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text variant="title" weight="bold">
            排行榜 · 公平竞技
          </Text>
          <Text variant="caption" tone="muted">
            最新生成：{timestamp}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: spacingScale.sm, flexWrap: 'wrap' }}>
          {(Object.keys(scopeLabels) as LeaderboardScope[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onScopeChange(key)}
              style={{
                padding: '10px 18px',
                borderRadius: 18,
                border: scope === key ? '1px solid rgba(107, 185, 255, 0.8)' : '1px solid rgba(255,255,255,0.08)',
                background: scope === key ? 'rgba(60, 100, 255, 0.32)' : 'rgba(15, 20, 32, 0.55)',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: scope === key ? 700 : 500
              }}
            >
              {scopeLabels[key]}
            </button>
          ))}
          <Button variant="outline" onClick={onRefresh}>
            刷新
          </Button>
        </div>
      </header>
      {status === 'loading' ? (
        <LoadingState label="排行榜加载中" />
      ) : status === 'error' ? (
        <LoadingState label={error ?? '排行榜加载失败'} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'rgba(198,210,255,0.75)' }}>
              <th style={{ padding: '12px 8px' }}>排名</th>
              <th style={{ padding: '12px 8px' }}>玩家</th>
              <th style={{ padding: '12px 8px' }}>段位</th>
              <th style={{ padding: '12px 8px' }}>Rating</th>
              <th style={{ padding: '12px 8px' }}>胜率</th>
              <th style={{ padding: '12px 8px' }}>近7日</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 700 }}>#{entry.rank}</td>
                <td style={{ padding: '12px 8px' }}>{entry.playerId}</td>
                <td style={{ padding: '12px 8px' }}>{entry.tier}</td>
                <td style={{ padding: '12px 8px' }}>{Math.round(entry.rating)}</td>
                <td style={{ padding: '12px 8px' }}>{Math.round(entry.winRate * 100)}%</td>
                <td style={{ padding: '12px 8px' }}>{entry.lastActiveAt ? formatRelative(entry.lastActiveAt) : '离线'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Surface padding="md" radius="lg" elevation="sunken" gap="sm">
        <Text variant="body" weight="medium">
          公平性措施
        </Text>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>服务端权威随机数与回放审计</li>
          <li>同 IP / 设备指纹风控，脚本检测实时评分</li>
          <li>观战延时与打码，杜绝暗中协同</li>
          <li>弃权扣分 &amp; 弱网络补偿，保留竞技体验</li>
        </ul>
      </Surface>
    </Surface>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center', color: 'rgba(198,210,255,0.78)' }}>{label}</div>
  );
}

function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  }
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
}
