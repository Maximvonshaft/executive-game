import { useEffect, useMemo, useRef, useState } from 'react';
import { loadPhaser } from '../../lib/phaser/phaserLoader';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { useOrientation } from '../../hooks/useOrientation';
import { spacingScale } from '../../theme/tokens';

export type GameArenaMode = 'doudizhu-ranked' | 'texas-sng' | 'xiangqi-duel';

type PlayerSeat = {
  id: string;
  name: string;
  rank: string;
  avatarUrl: string;
  latency: number;
  isMuted?: boolean;
  isDisconnected?: boolean;
  isAutoPlay?: boolean;
  chips: number;
  streak: number;
};

const DEFAULT_PLAYERS: PlayerSeat[] = [
  {
    id: 'p1',
    name: '你',
    rank: '星耀 · IV',
    avatarUrl: 'https://cdn.pixabay.com/photo/2016/03/27/07/08/fashion-1283863_1280.jpg',
    latency: 28,
    chips: 158000,
    streak: 3
  },
  {
    id: 'p2',
    name: 'AI·Alpha',
    rank: '星耀 · III',
    avatarUrl: 'https://cdn.pixabay.com/photo/2021/03/12/13/46/cyborg-6090043_1280.jpg',
    latency: 35,
    chips: 204500,
    streak: 1,
    isAutoPlay: true
  },
  {
    id: 'p3',
    name: '北辰',
    rank: '星耀 · II',
    avatarUrl: 'https://cdn.pixabay.com/photo/2015/01/08/18/26/man-593333_1280.jpg',
    latency: 64,
    chips: 132000,
    streak: 2
  }
];

const ASSETS = {
  table: 'https://cdn.pixabay.com/photo/2016/11/18/15/07/poker-1839895_1280.jpg',
  cardBack: 'https://cdn.pixabay.com/photo/2013/07/12/14/07/playing-card-148542_1280.png',
  cardFront: 'https://cdn.pixabay.com/photo/2013/07/12/15/21/ace-149244_1280.png',
  chip: 'https://cdn.pixabay.com/photo/2012/04/11/15/36/poker-29027_1280.png',
  chessBoard: 'https://cdn.pixabay.com/photo/2016/03/28/13/33/chinese-chess-1280513_1280.jpg',
  glowingTrail: 'https://cdn.pixabay.com/photo/2017/09/07/08/56/bokeh-2729118_1280.png'
};

type GameArenaProps = {
  mode: GameArenaMode;
  onExit: () => void;
};

export function GameArena({ mode, onExit }: GameArenaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<any>(null);
  const orientation = useOrientation();
  const insets = useSafeAreaInsets();
  const [isPhaserReady, setPhaserReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let activeGame: any = null;
    loadPhaser()
      .then((Phaser) => {
        if (disposed) {
          return;
        }
        setPhaserReady(true);
        class BootScene extends Phaser.Scene {
          constructor() {
            super('BootScene');
          }
          preload() {
            this.load.image('table', ASSETS.table);
            this.load.image('cardBack', ASSETS.cardBack);
            this.load.image('cardFront', ASSETS.cardFront);
            this.load.image('chip', ASSETS.chip);
            this.load.image('chessBoard', ASSETS.chessBoard);
            this.load.image('glowTrail', ASSETS.glowingTrail);
          }
          create() {
            this.scene.start('BattleScene');
          }
        }

        class BattleScene extends Phaser.Scene {
          constructor() {
            super('BattleScene');
          }

          create() {
            const width = this.scale.width;
            const height = this.scale.height;
            this.cameras.main.setBackgroundColor('#02060f');
            const background = this.add.image(width / 2, height / 2, mode === 'xiangqi-duel' ? 'chessBoard' : 'table');
            const scaleFactor = Math.max(width / background.width, height / background.height) * 1.05;
            background.setScale(scaleFactor).setAlpha(0.75);

            const spotlight = this.add.circle(width / 2, height / 2, Math.min(width, height) / 2.1, 0x0f243f, 0.6);
            spotlight.setBlendMode(Phaser.BlendModes.SCREEN);

            if (mode !== 'xiangqi-duel') {
              this.createCardFan(width, height);
              this.simulateDeal(width, height);
            } else {
              this.createChessFocus(width, height);
            }

            this.addParticles(width, height);
            this.animateCamera();
          }

          createCardFan(width: number, height: number) {
            const baseY = height * 0.62;
            const centerX = width / 2;
            const cards: any[] = [];
            for (let i = 0; i < 5; i += 1) {
              const card = this.add.image(centerX, baseY, i % 2 === 0 ? 'cardFront' : 'cardBack');
              card.setScale(0.22);
              card.setAlpha(0);
              cards.push(card);
            }
            this.tweens.timeline({
              ease: 'Quad.easeOut',
              duration: 420,
              tweens: cards.map((card, index) => ({
                targets: card,
                delay: index * 80,
                alpha: { from: 0, to: 1 },
                angle: -16 + index * 8,
                x: centerX - 120 + index * 60,
                y: baseY - Math.abs(index - 2) * 14
              }))
            });
          }

          simulateDeal(width: number, height: number) {
            const positions = [
              { x: width * 0.2, y: height * 0.28 },
              { x: width * 0.5, y: height * 0.15 },
              { x: width * 0.8, y: height * 0.28 }
            ];
            positions.forEach((pos, seatIndex) => {
              const tempCard = this.add.image(width / 2, height / 2, 'cardBack');
              tempCard.setScale(0.18);
              this.tweens.add({
                targets: tempCard,
                x: pos.x,
                y: pos.y,
                angle: seatIndex === 1 ? 0 : seatIndex === 0 ? -12 : 12,
                ease: 'Quart.easeOut',
                duration: 520,
                delay: 180 * seatIndex,
                onComplete: () => {
                  this.time.delayedCall(1200, () => tempCard.destroy());
                }
              });
            });
          }

          createChessFocus(width: number, height: number) {
            const highlight = this.add.rectangle(width * 0.55, height * 0.45, 120, 120, 0xffffff, 0.12);
            highlight.setStrokeStyle(2, 0x7d59ff, 0.8);
            this.tweens.add({
              targets: highlight,
              scale: 1.12,
              yoyo: true,
              repeat: -1,
              duration: 860,
              ease: 'Sine.easeInOut'
            });
          }

          addParticles(width: number, height: number) {
            const emitter = this.add.particles(0, 0, 'glowTrail', {
              x: { min: width * 0.2, max: width * 0.8 },
              y: { min: height * 0.15, max: height * 0.85 },
              speed: 28,
              lifespan: 1800,
              frequency: 120,
              scale: { min: 0.1, max: 0.22 },
              alpha: { start: 0.35, end: 0 },
              blendMode: 'SCREEN'
            });
            emitter.setDepth(-1);
          }

          animateCamera() {
            this.cameras.main.zoomTo(1.05, 1400, 'Sine.easeInOut', true, 0);
            this.time.addEvent({
              delay: 1400,
              loop: true,
              callback: () => {
                this.cameras.main.shake(280, 0.002, true);
              }
            });
          }
        }

        const width = containerRef.current?.clientWidth ?? 1280;
        const height = containerRef.current?.clientHeight ?? 720;
        activeGame = new Phaser.Game({
          type: Phaser.AUTO,
          width,
          height,
          transparent: true,
          parent: containerRef.current!,
          scene: [BootScene, BattleScene],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
          }
        });
        gameRef.current = activeGame;
      })
      .catch(() => {
        setPhaserReady(false);
      });

    const handleResize = () => {
      if (!gameRef.current || !containerRef.current) {
        return;
      }
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      gameRef.current.scale.resize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (activeGame) {
        activeGame.destroy(true);
        activeGame = null;
      }
    };
  }, [mode]);

  const players = useMemo(() => DEFAULT_PLAYERS, []);

  const timelineEvents = useMemo(
    () => [
      { id: 'evt1', label: 'P1 叫 3 分', tone: 'positive' as const },
      { id: 'evt2', label: 'P2 抢地主', tone: 'warning' as const },
      { id: 'evt3', label: 'P3 加倍', tone: 'positive' as const },
      { id: 'evt4', label: '系统：炸弹触发连胜保护', tone: 'info' as const }
    ],
    []
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, rgba(5,12,24,0.9), rgba(4,9,18,0.95))'
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }} className="app-holo-backdrop" />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacingScale.md + insets.top}px ${spacingScale.lg + insets.right}px ${spacingScale.md}px ${spacingScale.lg + insets.left}px`,
          zIndex: 5
        }}
      >
        <Text variant="subtitle" weight="bold">
          {mode === 'doudizhu-ranked' ? '斗地主 · 星耀排位' : mode === 'texas-sng' ? '德州扑克 · SNG 快赛' : '象棋 · 竞技对局'}
        </Text>
        <div style={{ display: 'flex', gap: spacingScale.md, alignItems: 'center' }}>
          <Surface padding="sm" elevation="sunken" radius="lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(100,255,218,0.85)' }} />
            <Text variant="caption">低延迟</Text>
          </Surface>
          <Button variant="outline" onClick={onExit}>
            退出
          </Button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: orientation === 'landscape' ? '1fr 320px' : '1fr',
          gap: spacingScale.lg,
          padding: `${spacingScale.sm}px ${spacingScale.lg + insets.right}px ${spacingScale.lg + insets.bottom}px ${spacingScale.lg + insets.left}px`
        }}
      >
        <section
          style={{
            position: 'relative',
            borderRadius: 32,
            overflow: 'hidden',
            background: 'rgba(5, 10, 18, 0.7)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.45)'
          }}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: orientation === 'landscape' ? '60vh' : '50vh' }} />
          {!isPhaserReady ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="body" tone="muted">
                正在初始化对战场景…
              </Text>
            </div>
          ) : null}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '32px 48px' }}>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    transform: index === 1 ? 'translateY(-12px)' : 'none'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={player.avatarUrl}
                      alt={`${player.name} Avatar`}
                      style={{ width: 92, height: 92, borderRadius: 28, border: '3px solid rgba(100,255,218,0.6)', objectFit: 'cover' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'rgba(4,11,24,0.85)',
                        color: '#64ffda',
                        fontSize: 12
                      }}
                    >
                      {player.rank}
                    </span>
                    {player.isAutoPlay ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: -12,
                          right: -12,
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: 'rgba(255,215,0,0.8)',
                          color: '#04121e',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        托管
                      </span>
                    ) : null}
                  </div>
                  <Surface padding="sm" elevation="sunken" radius="lg" style={{ alignItems: 'center', gap: 4, minWidth: 160 }}>
                    <Text variant="body" weight="medium">
                      {player.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      延迟 {player.latency}ms · 筹码 {player.chips.toLocaleString()}
                    </Text>
                    <Text variant="caption" tone="positive">
                      连胜 {player.streak}
                    </Text>
                  </Surface>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingBottom: 32 }}>
              <Surface
                padding="md"
                elevation="raised"
                radius="lg"
                style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 28 }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,97,136,0.9)', boxShadow: '0 0 18px rgba(255,97,136,0.8)' }} />
                <Text variant="body" weight="medium">
                  Time Bank 60s
                </Text>
              </Surface>
              <Surface
                padding="md"
                elevation="raised"
                radius="lg"
                style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 28 }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(100,255,218,0.9)', boxShadow: '0 0 18px rgba(100,255,218,0.8)' }} />
                <Text variant="body" weight="medium">
                  连胜保护 开启
                </Text>
              </Surface>
            </div>
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md }}>
          <Surface
            padding="md"
            elevation="raised"
            radius="lg"
            style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm, borderRadius: 24 }}
          >
            <Text variant="subtitle" weight="bold">
              操作面板
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <Button variant="outline">叫地主 ×3</Button>
              <Button variant="outline">抢地主</Button>
              <Button variant="outline">加倍</Button>
              <Button variant="outline">托管</Button>
              <Button variant="outline">表情 / 快捷语</Button>
            </div>
          </Surface>
          <Surface
            padding="md"
            elevation="raised"
            radius="lg"
            style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm, borderRadius: 24 }}
          >
            <Text variant="subtitle" weight="bold">
              出牌历史
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {timelineEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 12,
                    background:
                      event.tone === 'positive'
                        ? 'rgba(100,255,218,0.12)'
                        : event.tone === 'warning'
                        ? 'rgba(255,179,71,0.12)'
                        : 'rgba(125,89,255,0.12)'
                  }}
                >
                  <Text variant="caption" tone="muted">
                    {event.label}
                  </Text>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>15:32</span>
                </div>
              ))}
            </div>
          </Surface>
        </aside>
      </main>
    </div>
  );
}
