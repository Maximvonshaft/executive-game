import Phaser from 'phaser';
import { getGameManager } from '../core/gameContainer';
import { GameManager } from '../core/gameManager';
import { nextSeed } from '../core/deck';
import { formatCard } from '../ui/cardText';
import { shouldGrabLandlord } from '../core/ai';

export class DealingScene extends Phaser.Scene {
  private manager!: GameManager;
  private promptText!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container | null = null;
  private currentBidderIndex = 0;
  private bottomCardsGroup: Phaser.GameObjects.Group | null = null;

  constructor() {
    super('DealingScene');
  }

  create(): void {
    this.manager = getGameManager();
    this.cameras.main.setBackgroundColor('#0b2538');
    this.currentBidderIndex = 0;

    this.add.text(360, 120, '局号占位 · 发牌完成', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#d1d5db'
    }).setOrigin(0.5);

    this.promptText = this.add.text(360, 220, '等待抢地主流程', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.renderSeatInfo();
    this.renderBottomCards(false);
    this.time.delayedCall(600, () => this.promptNextBid());
  }

  private renderSeatInfo(): void {
    const players = this.manager.getPlayers();
    const layout = [
      { x: 120, y: 360 },
      { x: 360, y: 960 },
      { x: 600, y: 360 }
    ];
    players.forEach((player, index) => {
      const seat = layout[index];
      this.add.circle(seat.x, seat.y, 60, index === 1 ? 0xffc93c : 0x1f2937, 0.8);
      this.add.text(seat.x, seat.y, player.name, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#0f172a'
      }).setOrigin(0.5);
      this.add.text(seat.x, seat.y + 80, `手牌 ${player.hand.length} 张`, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#d1d5db'
      }).setOrigin(0.5);
    });
  }

  private renderBottomCards(revealed: boolean): void {
    this.bottomCardsGroup?.clear(true, true);
    this.bottomCardsGroup = this.add.group();
    const cards = this.manager.getBottomCards();
    cards.forEach((card, index) => {
      const x = 260 + index * 100;
      const y = 520;
      const rect = this.add.rectangle(x, y, 80, 112, revealed ? 0xfff2c7 : 0x1e293b, 1);
      rect.setStrokeStyle(2, 0xffffff, 0.6);
      this.bottomCardsGroup?.add(rect);
      if (revealed) {
        const label = this.add.text(x, y, formatCard(card), {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#111827'
        });
        label.setOrigin(0.5);
        this.bottomCardsGroup?.add(label);
      }
    });
  }

  private promptNextBid(): void {
    const players = this.manager.getPlayers();
    if (this.currentBidderIndex >= players.length) {
      this.promptText.setText('无人抢地主，重新发牌');
      const newSeed = nextSeed(this.manager.getSeed());
      this.manager.setSeed(newSeed);
      this.manager.startNewMatch(newSeed);
      this.time.delayedCall(1200, () => this.scene.restart());
      return;
    }
    const player = players[this.currentBidderIndex];
    if (player.id === 'player-0') {
      this.promptText.setText('轮到你抢地主');
      this.showPlayerOptions();
    } else {
      this.promptText.setText(`${player.name} 正在考虑...`);
      const shouldGrab = shouldGrabLandlord(player.hand);
      this.time.delayedCall(800, () => {
        this.handleBid(player.id, shouldGrab);
      });
    }
  }

  private showPlayerOptions(): void {
    this.buttons?.destroy(true);
    const container = this.add.container(360, 820);
    const grab = this.buildButton(-120, '抢地主', 0x22c55e, () => {
      this.handleBid('player-0', true);
    });
    const skip = this.buildButton(120, '不抢', 0xef4444, () => {
      this.handleBid('player-0', false);
    });
    container.add([grab, skip]);
    this.buttons = container;
  }

  private buildButton(x: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const rect = this.add.rectangle(x, 0, 180, 72, color, 1);
    rect.setStrokeStyle(3, 0xffffff, 0.9);
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', onClick);
    const text = this.add.text(x, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#0f172a'
    }).setOrigin(0.5);
    return this.add.container(0, 0, [rect, text]);
  }

  private handleBid(playerId: string, grab: boolean): void {
    this.buttons?.destroy(true);
    this.buttons = null;
    const players = this.manager.getPlayers();
    const player = players[this.currentBidderIndex];
    if (grab) {
      this.promptText.setText(`${player.name} 抢到了地主`);
      this.manager.setLandlord(playerId);
      this.renderBottomCards(true);
      this.time.delayedCall(1000, () => this.scene.start('PlayingScene'));
      return;
    }
    this.promptText.setText(`${player.name} 选择不抢`);
    this.currentBidderIndex += 1;
    this.time.delayedCall(500, () => this.promptNextBid());
  }
}
