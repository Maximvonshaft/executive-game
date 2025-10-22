import { useEffect, useRef } from 'react';
import type PhaserType from 'phaser';
import { useOrientation } from '../device';
import type { GameDiscipline } from './gameConfigs';

interface PhaserBattleStageProps {
  discipline: GameDiscipline;
}

type PhaserModule = typeof PhaserType;

function buildGradientRect(scene: PhaserType.Scene, width: number, height: number, colors: string[]) {
  const graphics = scene.add.graphics();
  colors.forEach((color, index) => {
    const y = (height / colors.length) * index;
    graphics.fillStyle(parseInt(color.replace('#', ''), 16), 1);
    graphics.fillRect(-width / 2, y - height / 2, width, height / colors.length + 4);
  });
  graphics.setAlpha(0.82);
  return graphics;
}

function drawPokerTable(scene: PhaserType.Scene, Phaser: PhaserModule) {
  const table = scene.add.graphics();
  table.fillStyle(0x052d5c, 0.92);
  table.fillEllipse(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width * 0.72, scene.scale.height * 0.52);
  table.lineStyle(6, 0x43e0ff, 0.8);
  table.strokeEllipse(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width * 0.68, scene.scale.height * 0.48);

  const emitterTextureKey = 'chip-spark';
  if (!scene.textures.exists(emitterTextureKey)) {
    const radius = 12;
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffe66d, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(4, 0xff922b, 1);
    graphics.strokeCircle(radius, radius, radius);
    graphics.generateTexture(emitterTextureKey, radius * 2, radius * 2);
    graphics.destroy();
  }

  const emitter = scene.add.particles(0, 0, emitterTextureKey, {
    x: { min: scene.scale.width * 0.3, max: scene.scale.width * 0.7 },
    y: scene.scale.height * 0.44,
    speed: { min: 40, max: 120 },
    angle: { min: 240, max: 300 },
    lifespan: 1400,
    quantity: 1,
    gravityY: 200,
    scale: { start: 0.6, end: 0.1 },
    alpha: { start: 0.9, end: 0 },
    blendMode: 'ADD'
  });

  scene.time.delayedCall(3200, () => {
    emitter.explode(18, scene.scale.width / 2, scene.scale.height * 0.36);
  });

  const camera = scene.cameras.main;
  camera.setZoom(1.05);
  scene.tweens.add({
    targets: camera,
    zoom: 1,
    duration: 2200,
    ease: Phaser.Math.Easing.Sine.Out
  });

  const dealerChip = scene.add.circle(scene.scale.width / 2, scene.scale.height * 0.48, 24, 0xffffff, 1);
  dealerChip.setStrokeStyle(6, 0x3b82f6, 1);
  scene.tweens.add({
    targets: dealerChip,
    y: scene.scale.height * 0.46,
    duration: 680,
    yoyo: true,
    repeat: -1,
    ease: Phaser.Math.Easing.Sine.InOut
  });
}

function drawDoudizhu(scene: PhaserType.Scene, Phaser: PhaserModule) {
  const gradient = buildGradientRect(scene, scene.scale.width * 0.9, scene.scale.height * 0.6, ['#0f172a', '#1d2753', '#274780']);
  gradient.setPosition(scene.scale.width / 2, scene.scale.height * 0.52);

  const fanGroup = scene.add.group();
  const centerX = scene.scale.width / 2;
  const baseY = scene.scale.height * 0.62;
  for (let i = 0; i < 12; i += 1) {
    const card = scene.add.rectangle(centerX, baseY, scene.scale.width * 0.06, scene.scale.height * 0.32, 0xfff7ed, 0.96);
    card.setStrokeStyle(4, 0xf97316, 0.9);
    card.setOrigin(0.5, 0.9);
    card.setAngle(-18 + i * 3.2);
    fanGroup.add(card);
    scene.tweens.add({
      targets: card,
      angle: card.angle + Phaser.Math.Between(-4, 4),
      duration: 1400 + i * 42,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut
    });
  }

  const rocket = scene.add.triangle(centerX, scene.scale.height * 0.42, 0, 120, 120, -20, -120, -20, 0xffe066, 0.94);
  rocket.setStrokeStyle(6, 0xfbbf24, 1);
  scene.tweens.timeline({
    targets: rocket,
    ease: Phaser.Math.Easing.Cubic.InOut,
    loop: -1,
    tweens: [
      { x: centerX - 48, duration: 600 },
      { x: centerX + 64, duration: 540 },
      { x: centerX, duration: 420 }
    ]
  });

  const burstTextureKey = 'firework-particle';
  if (!scene.textures.exists(burstTextureKey)) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xff5722, 1);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture(burstTextureKey, 32, 32);
    graphics.destroy();
  }
  scene.time.addEvent({
    delay: 1800,
    loop: true,
    callback: () => {
      const emitter = scene.add.particles(0, 0, burstTextureKey, {
        x: centerX + Phaser.Math.Between(-80, 80),
        y: scene.scale.height * 0.38,
        speed: { min: 60, max: 160 },
        lifespan: 1200,
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        quantity: 8
      });
      scene.time.delayedCall(900, () => emitter.destroy());
    }
  });
}

function drawXiangqi(scene: PhaserType.Scene, Phaser: PhaserModule) {
  const board = scene.add.graphics();
  const padding = 48;
  const width = scene.scale.width * 0.64;
  const height = scene.scale.height * 0.72;
  const left = (scene.scale.width - width) / 2;
  const top = (scene.scale.height - height) / 2;
  board.fillStyle(0x3f2f19, 1);
  board.fillRoundedRect(left - 20, top - 20, width + 40, height + 40, 24);
  board.fillStyle(0xdec09c, 1);
  board.fillRect(left, top, width, height);
  board.lineStyle(3, 0x6b4d2b, 1);
  for (let i = 0; i < 9; i += 1) {
    const x = left + padding + i * ((width - padding * 2) / 8);
    board.lineBetween(x, top + padding, x, top + height - padding);
  }
  for (let j = 0; j < 10; j += 1) {
    const y = top + padding + j * ((height - padding * 2) / 9);
    board.lineBetween(left + padding, y, left + width - padding, y);
  }
  board.strokeRoundedRect(left - 20, top - 20, width + 40, height + 40, 24);

  const river = scene.add.rectangle(scene.scale.width / 2, top + height / 2, width - padding * 1.2, 28, 0x1c4532, 0.42);
  scene.tweens.add({
    targets: river,
    alpha: { from: 0.32, to: 0.62 },
    duration: 1800,
    yoyo: true,
    repeat: -1
  });

  const piece = scene.add.circle(left + padding, top + padding, 22, 0xb45309, 1);
  piece.setStrokeStyle(6, 0x7c2d12, 1);
  const targetX = left + padding + ((width - padding * 2) / 8) * 4;
  const targetY = top + padding + ((height - padding * 2) / 9) * 2;
  scene.tweens.timeline({
    targets: piece,
    loop: -1,
    tweens: [
      { x: targetX, duration: 620, ease: Phaser.Math.Easing.Quadratic.InOut },
      { y: targetY, duration: 540, ease: Phaser.Math.Easing.Quadratic.InOut },
      { x: left + padding, duration: 620, ease: Phaser.Math.Easing.Quadratic.InOut },
      { y: top + padding, duration: 540, ease: Phaser.Math.Easing.Quadratic.InOut }
    ]
  });
}

function createSceneForDiscipline(discipline: GameDiscipline, Phaser: PhaserModule) {
  return class BattleScene extends Phaser.Scene {
    constructor() {
      super(`${discipline}-scene`);
    }

    create() {
      this.cameras.main.setBackgroundColor('#020617');
      if (discipline === 'texas') {
        drawPokerTable(this, Phaser);
      } else if (discipline === 'doudizhu') {
        drawDoudizhu(this, Phaser);
      } else {
        drawXiangqi(this, Phaser);
      }
    }

    resize() {
      this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
      this.cameras.main.centerOn(this.scale.width / 2, this.scale.height / 2);
    }
  };
}

export function PhaserBattleStage({ discipline }: PhaserBattleStageProps) {
  const { orientation, width, height } = useOrientation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<PhaserModule | null>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);
  const currentSceneKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let destroyed = false;

    async function loadPhaser() {
      if (phaserRef.current) return phaserRef.current;
      const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.esm.js');
      const resolved = (module as { default?: PhaserModule })?.default ?? module;
      phaserRef.current = resolved as PhaserModule;
      return phaserRef.current!;
    }

    loadPhaser()
      .then((Phaser) => {
        if (destroyed) return;
        const parent = containerRef.current;
        if (!parent) return;
        const BattleScene = createSceneForDiscipline(discipline, Phaser);
        currentSceneKey.current = `${discipline}-scene`;
        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: Math.max(960, width || 960),
          height: Math.max(540, height || 540),
          parent,
          backgroundColor: '#020617',
          scene: [BattleScene],
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          }
        });
        gameRef.current = game;
      })
      .catch((error) => {
        console.error('Phaser 加载失败', error);
      });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [discipline, width, height]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const phaser = phaserRef.current;
    if (!phaser) return;
    const sceneKey = currentSceneKey.current;
    if (!sceneKey) return;
    const scene = game.scene.getScene(sceneKey) as Phaser.Scene & { resize?: () => void };
    if (scene && scene.scale) {
      scene.scale.resize(Math.max(960, width || 960), Math.max(540, height || 540));
      scene.cameras.main.setViewport(0, 0, Math.max(960, width || 960), Math.max(540, height || 540));
      if (scene.resize) {
        scene.resize();
      }
    }
  }, [orientation, width, height]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden' }} />;
}
