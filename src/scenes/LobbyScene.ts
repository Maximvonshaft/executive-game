import Phaser from 'phaser';
import { getGameManager } from '../core/gameContainer';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super('LobbyScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f1c2b');
    const title = this.add.text(360, 200, '单机斗地主', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: '#ffffff'
    });
    title.setOrigin(0.5);

    const manager = getGameManager();
    const seedInfo = this.add.text(360, 320, `当前种子：${manager.getSeed()}`, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#cbd5f5'
    });
    seedInfo.setOrigin(0.5);

    const button = this.add.rectangle(360, 520, 320, 96, 0xffc93c, 1);
    button.setStrokeStyle(4, 0xffffff, 0.8);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(button.x, button.y, '开始游戏', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#10141c'
    });
    buttonText.setOrigin(0.5);

    button.on('pointerdown', () => {
      manager.startNewMatch();
      this.scene.start('DealingScene');
    });

    this.add.text(360, 680, '设置项将在后续版本补齐，当前为基线体验。', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#9ca3af'
    }).setOrigin(0.5);
  }
}
