import { useMemo } from 'react';
import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { GameDefinition } from '../constants/gameCatalog';
import { PhaserStage } from '../modules/game/PhaserStage';
import { SafeAreaInsets } from '../state/modules/uiSlice';
import { spacingScale } from '../theme/tokens';

export type GameScreenProps = {
  game: GameDefinition;
  safeArea: SafeAreaInsets;
  orientation: 'portrait' | 'landscape';
  onExit: () => void;
};

export function GameScreen({ game, safeArea, orientation, onExit }: GameScreenProps) {
  const players = useMemo(
    () =>
      new Array(game.maxPlayers).fill(null).map((_, index) => ({
        id: `player-${index + 1}`,
        name: `玩家 ${index + 1}`,
        rank: `至尊 ${index + 8}`,
        latency: Math.round(20 + Math.random() * 80),
        trust: index === 0 ? '手动' : '托管'
      })),
    [game.maxPlayers]
  );

  const hudActions = useMemo(() => game.actions.slice(0, 4), [game.actions]);

  return (
    <div style={{ display: 'grid', gap: spacingScale.md, gridTemplateColumns: orientation === 'landscape' ? '2fr 1fr' : '1fr' }}>
      <div style={{ position: 'relative', minHeight: 420 }}>
        <PhaserStage game={game} safeAreaBottom={safeArea.bottom} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacingScale.sm }}>
            {players.slice(0, 2).map((player) => (
              <PlayerHud key={player.id} player={player} align="left" />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacingScale.sm }}>
            {players.slice(2, 4).map((player) => (
              <PlayerHud key={player.id} player={player} align="right" />
            ))}
            <ActionPanel actions={hudActions} />
          </div>
        </div>
      </div>
      <aside style={{ display: 'grid', gap: spacingScale.md }}>
        <Surface padding="md" radius="lg" elevation="raised" gap="sm">
          <Text variant="body" weight="bold">
            {game.name}
          </Text>
          <Text variant="caption" tone="muted">
            {game.tagline}
          </Text>
          <Button variant="outline" onClick={onExit}>
            离开牌桌
          </Button>
        </Surface>
        <Surface padding="md" radius="lg" elevation="sunken" gap="sm">
          <Text variant="body" weight="medium">
            回合倒计时
          </Text>
          <div style={{ height: 14, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }}>
            <div
              style={{
                width: '72%',
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #38bdf8, #22d3ee)',
                boxShadow: '0 0 18px rgba(34, 211, 238, 0.6)'
              }}
            />
          </div>
          <Text variant="caption" tone="muted">
            Time Bank +12s 已启用
          </Text>
        </Surface>
        <Surface padding="md" radius="lg" elevation="sunken" gap="sm">
          <Text variant="body" weight="medium">
            出牌历史
          </Text>
          <div style={{ display: 'grid', gap: 6 }}>
            {['跟注 40', '加注 120', '弃牌', '发牌 → 翻牌'].map((record, index) => (
              <div key={record} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(210,220,255,0.86)' }}>
                <span>{record}</span>
                <span>{index * 8 + 3}s</span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface padding="md" radius="lg" elevation="sunken" gap="sm">
          <Text variant="body" weight="medium">
            快捷交互
          </Text>
          <div style={{ display: 'flex', gap: spacingScale.sm, flexWrap: 'wrap' }}>
            {['打得漂亮', '快点', '等我', '举报'].map((phrase) => (
              <Button key={phrase} variant="ghost">
                {phrase}
              </Button>
            ))}
          </div>
        </Surface>
      </aside>
    </div>
  );
}

type PlayerHudProps = {
  player: { id: string; name: string; rank: string; latency: number; trust: string };
  align: 'left' | 'right';
};

function PlayerHud({ player, align }: PlayerHudProps) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 180,
        maxWidth: 220,
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        background: 'rgba(8, 12, 22, 0.72)',
        borderRadius: 18,
        padding: '12px 16px',
        border: '1px solid rgba(116, 196, 255, 0.4)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)'
      }}
    >
      <Text variant="body" weight="bold">
        {player.name}
      </Text>
      <Text variant="caption" tone="muted">
        {player.rank}
      </Text>
      <div style={{ display: 'flex', gap: 12, color: 'rgba(180, 210, 255, 0.76)', fontSize: 12 }}>
        <span>延迟 {player.latency}ms</span>
        <span>{player.trust}</span>
      </div>
    </div>
  );
}

function ActionPanel({ actions }: { actions: string[] }) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: spacingScale.sm,
        background: 'rgba(6, 10, 20, 0.78)',
        borderRadius: 24,
        padding: '16px',
        border: '1px solid rgba(90,120,255,0.45)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
      }}
    >
      {actions.map((action) => (
        <Button key={action} variant="primary">
          {action}
        </Button>
      ))}
    </div>
  );
}
