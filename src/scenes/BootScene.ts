import Phaser from 'phaser';
import { getGameManager } from '../core/gameContainer';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.add.text(360, 640, '加载中...', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  create(): void {
    getGameManager();
    this.scene.start('LobbyScene');
  }
}
