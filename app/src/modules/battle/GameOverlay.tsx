import { Fragment, useMemo } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useOrientation } from '../device';
import { avatarSprites } from '../assets/avatarSprites';
import { getHUDConfig, type GameDiscipline } from './gameConfigs';
import { useBattleSimulation } from './hooks/useBattleSimulation';

interface GameOverlayProps {
  discipline: GameDiscipline;
}

function resolveAvatar(id: string) {
  return avatarSprites.find((item) => item.id === id)?.uri ?? avatarSprites[0].uri;
}

function toneToVariant(tone: 'primary' | 'accent' | 'caution' | 'safe') {
  switch (tone) {
    case 'accent':
      return 'secondary';
    case 'caution':
      return 'danger';
    case 'safe':
      return 'outline';
    default:
      return 'primary';
  }
}

export function GameOverlay({ discipline }: GameOverlayProps) {
  const orientationState = useOrientation();
  const config = useMemo(() => getHUDConfig(discipline), [discipline]);
  const simulation = useBattleSimulation(discipline);
  const padding = config.safeAreaPadding(orientationState.safeArea);
  const aspect = orientationState.aspectPreset;

  const seatPositions = useMemo(() => {
    return config.seats.map((seat) => {
      const preset = aspect === '19.5:9' || aspect === 'ultraWide' ? seat.position.landscapeWide : seat.position.landscape;
      return {
        ...seat,
        x: preset.x,
        y: preset.y
      };
    });
  }, [aspect, config.seats]);

  if (orientationState.orientation !== 'landscape') {
    return (
      <Surface
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(18px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px'
        }}
        radius="lg"
        elevation="raised"
      >
        <Text variant="title" weight="bold">
          请横屏体验
        </Text>
        <Text variant="body" tone="muted">
          对战场景仅提供横屏最佳体验，请旋转设备以继续。
        </Text>
      </Surface>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
        pointerEvents: 'none'
      }}
    >
      {seatPositions.map((seat) => {
        const player = simulation.players.find((item) => item.seatId === seat.id);
        return (
          <Surface
            key={seat.id}
            elevation="raised"
            radius="lg"
            padding="sm"
            gap="sm"
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              left: `${seat.x * 100}%`,
              top: `${seat.y * 100}%`,
              width: 220,
              pointerEvents: 'auto',
              background:
                seat.role === 'self'
                  ? 'linear-gradient(135deg, rgba(8,145,178,0.82), rgba(59,130,246,0.88))'
                  : 'linear-gradient(135deg, rgba(15,23,42,0.82), rgba(30,41,59,0.78))',
              border: '1px solid rgba(148,163,184,0.4)',
              boxShadow: '0 20px 60px rgba(15,23,42,0.45)'
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <img
                src={resolveAvatar(player?.avatar ?? 'aurora-strategist')}
                alt={player?.nickname ?? seat.label}
                width={64}
                height={64}
                style={{ borderRadius: 18, border: '2px solid rgba(255,255,255,0.45)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text variant="body" weight="bold">
                  {player?.nickname ?? seat.label}
                </Text>
                <Text variant="caption" tone="muted">
                  {player?.rankBadge ?? '等待入座'}
                </Text>
                {player ? (
                  <Text variant="caption" tone={player.latencyMs < 80 ? 'positive' : 'caution'}>
                    延迟 {player.latencyMs}ms · 筹码 {player.stack}
                  </Text>
                ) : null}
              </div>
            </div>
            {player?.isAuto ? (
              <Surface
                elevation="sunken"
                radius="md"
                padding="xs"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <Text variant="caption" tone="muted">
                  智能托管中
                </Text>
              </Surface>
            ) : null}
          </Surface>
        );
      })}

      <div
        style={{
          position: 'absolute',
          bottom: `${Math.max(32, padding.bottom)}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          pointerEvents: 'auto'
        }}
      >
        {config.actionRail.map((action) => (
          <Button key={action.id} variant={toneToVariant(action.tone)} size="lg">
            {action.label}
          </Button>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          top: `${padding.top}px`,
          left: `${padding.left}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 320,
          pointerEvents: 'auto'
        }}
      >
        <Surface elevation="raised" radius="lg" padding="sm">
          <Text variant="title" weight="bold">
            {config.title}
          </Text>
          <Text variant="caption" tone="muted">
            {config.description}
          </Text>
        </Surface>
        <Surface elevation="sunken" radius="md" padding="sm">
          <Text variant="body" weight="bold">
            {simulation.countdown.phase === 'action' ? '操作倒计时' : '阶段切换'}
          </Text>
          <Text variant="display" weight="bold">
            {simulation.countdown.secondsRemaining}s
          </Text>
          <Text variant="caption" tone="muted">
            总时长 {simulation.countdown.totalSeconds}s · Time Bank 自动补时
          </Text>
        </Surface>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: `${padding.bottom}px`,
          right: `${padding.right}px`,
          width: 320,
          pointerEvents: 'auto'
        }}
      >
        <Surface elevation="raised" radius="lg" padding="sm" style={{ maxHeight: 220, overflow: 'hidden' }}>
          <Text variant="body" weight="bold">
            状态快照
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {simulation.statusFeed.map((event) => (
              <Surface key={event.id} elevation="sunken" radius="md" padding="xs">
                <Text variant="caption" tone={event.tone === 'success' ? 'positive' : event.tone === 'warning' ? 'caution' : event.tone === 'critical' ? 'critical' : 'muted'}>
                  {new Date(event.timestamp).toLocaleTimeString()} · {event.content}
                </Text>
              </Surface>
            ))}
          </div>
        </Surface>
      </div>

      <div
        style={{
          position: 'absolute',
          top: `${padding.top}px`,
          right: `${padding.right}px`,
          width: 280,
          pointerEvents: 'auto'
        }}
      >
        <Surface elevation="sunken" radius="lg" padding="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Text variant="body" weight="bold">
            最近牌谱 / 棋谱
          </Text>
          {simulation.handHistory.map((entry, index) => (
            <Fragment key={index}>
              <Text variant="caption" tone="muted">
                {entry}
              </Text>
            </Fragment>
          ))}
        </Surface>
      </div>
    </div>
  );
}
