import { useEffect, useRef, useState } from 'react';
import type { GameDefinition } from '../../constants/gameCatalog';
import type { PhaserModule } from '../../types/phaser';

const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';

type PhaserStageProps = {
  game: GameDefinition;
  safeAreaBottom: number;
};

export function PhaserStage({ game, safeAreaBottom }: PhaserStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const Phaser = await loadPhaser();
        if (cancelled || !containerRef.current) {
          return;
        }
        setLoading(false);
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const scene = createScene(Phaser, game);
        const instance = new Phaser.Game({
          type: Phaser.AUTO,
          parent: containerRef.current,
          width,
          height,
          backgroundColor: '#04060d',
          scene,
          scale: {
            mode: (Phaser as any).Scale?.RESIZE ?? undefined,
            autoCenter: (Phaser as any).Scale?.CENTER_BOTH ?? undefined
          }
        });
        gameInstanceRef.current = instance;
      } catch (err) {
        console.error('Failed to boot Phaser scene', err);
        setError(err instanceof Error ? err.message : 'Phaser 初始化失败');
      }
    }

    setup();

    return () => {
      cancelled = true;
      const instance = gameInstanceRef.current;
      if (instance) {
        instance.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [game]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      const instance = gameInstanceRef.current;
      if (instance && instance.scale && typeof instance.scale.resize === 'function') {
        instance.scale.resize(container.clientWidth, container.clientHeight);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: `calc(100% - ${safeAreaBottom}px)`,
        borderRadius: 24,
        overflow: 'hidden',
        background: `center / cover no-repeat url(${game.board})`,
        boxShadow: '0 18px 48px rgba(0,0,0,0.45)'
      }}
    >
      {loading ? (
        <LoadingOverlay label="正在唤起 Phaser 对战场景" />
      ) : error ? (
        <LoadingOverlay label={error} />
      ) : null}
    </div>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'rgba(4, 8, 18, 0.78)',
        color: '#d8e4ff',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: 1.2
      }}
    >
      <div className="phaser-spinner" />
      <span>{label}</span>
    </div>
  );
}

async function loadPhaser(): Promise<PhaserModule> {
  if (typeof window === 'undefined') {
    throw new Error('Phaser 仅能在浏览器环境加载');
  }
  if (window.Phaser) {
    return window.Phaser;
  }
  const existing = document.querySelector(`script[data-phaser-cdn="${PHASER_CDN}"]`);
  if (existing) {
    await waitForGlobalPhaser();
    if (window.Phaser) {
      return window.Phaser;
    }
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PHASER_CDN;
    script.async = true;
    script.dataset.phaserCdn = PHASER_CDN;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Phaser 脚本加载失败'));
    document.head.appendChild(script);
  });
  await waitForGlobalPhaser();
  if (!window.Phaser) {
    throw new Error('Phaser 模块未按预期挂载');
  }
  return window.Phaser;
}

function waitForGlobalPhaser() {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (window.Phaser) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

function createScene(Phaser: PhaserModule, game: GameDefinition) {
  const themeColor = resolveThemeColor(game.theme);
  const accentColor = resolveAccentColor(game.theme);

  class ExecutiveArena extends (Phaser as any).Scene {
    private chipEmitter?: any;

    constructor() {
      super({ key: `arena-${game.id}` });
    }

    preload() {
      this.load.image('board', game.board);
      this.load.image('cover', game.cover);
    }

    create() {
      const { width, height } = this.scale.gameSize;
      this.add.rectangle(width / 2, height / 2, width * 1.1, height * 1.1, Phaser.Display.Color.HexStringToColor(themeColor).color, 0.85);
      const board = this.add.image(width / 2, height / 2, 'board');
      board.setDisplaySize(width * 0.85, height * 0.85);
      board.setAlpha(0.92);
      board.setTint(Phaser.Display.Color.HexStringToColor(accentColor).color);

      const title = this.add.text(width / 2, height * 0.12, game.name, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: `${Math.round(height * 0.06)}px`,
        color: '#f5f7ff',
        fontStyle: 'bold'
      });
      title.setOrigin(0.5);
      const tagline = this.add.text(width / 2, height * 0.18, game.tagline, {
        fontFamily: 'Poppins, sans-serif',
        fontSize: `${Math.round(height * 0.03)}px`,
        color: 'rgba(220, 230, 255, 0.85)'
      });
      tagline.setOrigin(0.5);

      const players = this.add.group();
      const playerSlots = [
        { x: width * 0.15, y: height * 0.18 },
        { x: width * 0.85, y: height * 0.18 },
        { x: width * 0.18, y: height * 0.82 },
        { x: width * 0.82, y: height * 0.82 }
      ];
      playerSlots.slice(0, game.maxPlayers).forEach((slot, index) => {
        const container = this.add.container(slot.x, slot.y);
        const bubble = this.add.rectangle(0, 0, width * 0.18, height * 0.12, 0x0d1324, 0.72);
        bubble.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(accentColor).color, 0.9);
        bubble.setOrigin(0.5);
        const avatar = this.add.image(-bubble.width * 0.32, 0, 'cover');
        avatar.setDisplaySize(bubble.height * 0.85, bubble.height * 0.85);
        avatar.setMask(new Phaser.Display.Masks.GeometryMask(this, this.add.circle(-bubble.width * 0.32, 0, bubble.height * 0.42)));
        const name = this.add.text(-bubble.width * 0.05, -bubble.height * 0.18, `玩家 ${index + 1}`, {
          fontFamily: 'Poppins, sans-serif',
          fontSize: `${Math.round(bubble.height * 0.22)}px`,
          color: '#ffffff'
        });
        name.setOrigin(0, 0.5);
        const badge = this.add.text(-bubble.width * 0.05, bubble.height * 0.18, `段位 · ${index + 10}`, {
          fontFamily: 'Poppins, sans-serif',
          fontSize: `${Math.round(bubble.height * 0.18)}px`,
          color: 'rgba(200, 216, 255, 0.8)'
        });
        badge.setOrigin(0, 0.5);
        container.add([bubble, avatar, name, badge]);
        container.setScale(0.92);
        players.add(container);
      });

      const particles = this.add.particles(0, 0, 'cover', {
        x: { min: width * 0.1, max: width * 0.9 },
        y: { start: height * 0.4, end: height * 0.6 },
        alpha: { start: 0.5, end: 0 },
        scale: { start: 0.08, end: 0.02 },
        speed: { min: 30, max: 80 },
        lifespan: 2200,
        gravityY: 0
      });
      this.chipEmitter = particles.emitters.first;
      this.time.addEvent({
        delay: 3200,
        loop: true,
        callback: () => {
          if (this.chipEmitter) {
            this.chipEmitter.explode(12, width / 2, height * 0.45);
          }
        }
      });

      this.tweens.add({
        targets: [title, tagline],
        alpha: { from: 0, to: 1 },
        yoyo: false,
        duration: 720,
        ease: 'Sine.easeOut'
      });
    }

    update(time: number) {
      const wave = Math.sin(time / 600);
      this.cameras.main.setLerp(0.04, 0.04);
      this.cameras.main.setScroll(wave * 6, Math.cos(time / 500) * 4);
    }
  }

  return new ExecutiveArena();
}

function resolveThemeColor(theme: GameDefinition['theme']) {
  switch (theme) {
    case 'neon':
      return '#10172f';
    case 'jade':
      return '#0a1f12';
    case 'imperial':
      return '#2a0d17';
    case 'zen':
      return '#111b16';
    default:
      return '#05070d';
  }
}

function resolveAccentColor(theme: GameDefinition['theme']) {
  switch (theme) {
    case 'neon':
      return '#5ed0ff';
    case 'jade':
      return '#26dd9f';
    case 'imperial':
      return '#ff6587';
    case 'zen':
      return '#85f8c0';
    default:
      return '#6a8cff';
  }
}
