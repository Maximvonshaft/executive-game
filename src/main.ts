import Phaser from 'phaser';
import { LobbyScene } from './scenes/LobbyScene';
import { DealingScene } from './scenes/DealingScene';
import { PlayingScene } from './scenes/PlayingScene';
import { SettlementScene } from './scenes/SettlementScene';
import { BootScene } from './scenes/BootScene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#12303d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280
  },
  scene: [BootScene, LobbyScene, DealingScene, PlayingScene, SettlementScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(gameConfig);
