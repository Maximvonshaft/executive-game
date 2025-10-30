import GameScene from './game/GameScene.js';

function boot() {
  const container = document.getElementById('game-container');
  if (!window.Phaser) {
    console.error('Phaser 加载失败');
    return;
  }
  container.classList.remove('no-phaser');

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#102039',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [GameScene],
  };

  new Phaser.Game(config);
}

document.addEventListener('DOMContentLoaded', boot);
