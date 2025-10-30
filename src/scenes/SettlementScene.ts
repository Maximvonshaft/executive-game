import Phaser from 'phaser';
import { getGameManager } from '../core/gameContainer';
import { MatchResult } from '../core/gameManager';
import { nextSeed } from '../core/deck';

interface SettlementData extends MatchResult {}

export class SettlementScene extends Phaser.Scene {
  constructor() {
    super('SettlementScene');
  }

  create(data: SettlementData): void {
    this.cameras.main.setBackgroundColor('#111827');
    const manager = getGameManager();

    const winnerText = data.winnerRole === 'landlord' ? '地主获胜' : '农民获胜';
    this.add.text(360, 160, winnerText, {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color: '#f8fafc'
    }).setOrigin(0.5);

    this.add.text(360, 240, `倍数 ×${data.multiple}`, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#fbbf24'
    }).setOrigin(0.5);

    const breakdown = data.multipleBreakdown
      .map((entry) => `${entry.label} ×${entry.value}`)
      .join(' · ');
    this.add.text(360, 300, breakdown || '无额外倍数', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#cbd5f5'
    }).setOrigin(0.5);

    const scores = this.calculateScores(data);
    const scoreText = scores
      .map((item) => `${item.name}：${item.score > 0 ? '+' : ''}${item.score}`)
      .join('\n');
    this.add.text(360, 420, scoreText, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#e2e8f0',
      align: 'center'
    }).setOrigin(0.5);

    this.createButton(360, 620, '再来一盘', 0x22c55e, () => {
      manager.startNewMatch();
      this.scene.start('DealingScene');
    });

    this.createButton(360, 720, '更换对手', 0x0ea5e9, () => {
      manager.startNewMatch(nextSeed(manager.getSeed()));
      this.scene.start('DealingScene');
    });

    this.createButton(360, 820, '回大厅', 0x334155, () => {
      this.scene.start('LobbyScene');
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const rect = this.add.rectangle(x, y, 240, 72, color, 1);
    rect.setStrokeStyle(3, 0xffffff, 0.9);
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', onClick);
    this.add.text(x, y, label, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#0f172a'
    }).setOrigin(0.5);
  }

  private calculateScores(result: SettlementData): { name: string; score: number }[] {
    const manager = getGameManager();
    const players = manager.getPlayers();
    const landlord = players.find((player) => player.role === 'landlord');
    const base = result.multiple;
    if (!landlord) {
      return players.map((player) => ({ name: player.name, score: 0 }));
    }
    const landlordScore = result.winnerRole === 'landlord' ? base * 2 : -base * 2;
    const farmerScore = result.winnerRole === 'landlord' ? -base : base;
    return players.map((player) => ({
      name: player.name,
      score: player.role === 'landlord' ? landlordScore : farmerScore
    }));
  }
}
