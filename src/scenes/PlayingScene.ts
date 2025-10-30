import Phaser from 'phaser';
import { getGameManager } from '../core/gameContainer';
import { GameManager, MatchFinishedError } from '../core/gameManager';
import { formatCard } from '../ui/cardText';
import { analyzeCombination } from '../core/combinations';
import { RANK_ORDER } from '../core/types';

interface ActionButtons {
  play: Phaser.GameObjects.Container;
  pass: Phaser.GameObjects.Container;
  hint: Phaser.GameObjects.Container;
  arrange: Phaser.GameObjects.Container;
}

export class PlayingScene extends Phaser.Scene {
  private manager!: GameManager;
  private hudText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private playerHandLayer!: Phaser.GameObjects.Container;
  private tableGroup!: Phaser.GameObjects.Group;
  private actionButtons!: ActionButtons;
  private selectedCards = new Set<string>();
  private handlingTurn = false;

  constructor() {
    super('PlayingScene');
  }

  create(): void {
    this.manager = getGameManager();
    if (!this.manager.getLandlordId()) {
      this.manager.setLandlord('player-0');
    }
    this.cameras.main.setBackgroundColor('#0a1f2f');
    this.tableGroup = this.add.group();

    this.hudText = this.add.text(360, 80, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    this.infoText = this.add.text(360, 880, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#fbbf24'
    }).setOrigin(0.5);

    this.playerHandLayer = this.add.container(360, 1080);
    this.createActionButtons();
    this.renderState();
    this.time.delayedCall(300, () => this.processTurn());
  }

  private createActionButtons(): void {
    const baseY = 960;
    this.actionButtons = {
      play: this.createButton(520, baseY, '出牌', 0x22c55e, () => this.handlePlay()),
      pass: this.createButton(200, baseY, '过牌', 0x334155, () => this.handlePass()),
      hint: this.createButton(360, baseY, '提示', 0x3b82f6, () => this.handleHint()),
      arrange: this.createButton(40, baseY, '理牌', 0xf97316, () => this.handleArrange())
    };
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, 140, 64, color, 1);
    rect.setStrokeStyle(3, 0xffffff, 0.9);
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', onClick);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#0f172a'
    }).setOrigin(0.5);
    container.add([rect, text]);
    container.setData('rect', rect);
    container.setData('text', text);
    container.setData('color', color);
    return container;
  }

  private renderState(): void {
    this.updateHud();
    this.renderTablePlay();
    this.renderPlayerHand();
    this.updateActionAvailability();
  }

  private updateHud(): void {
    const current = this.manager.getCurrentPlayer();
    const multiple = this.manager.getMultiple();
    const landlordId = this.manager.getLandlordId();
    const players = this.manager.getPlayers();
    const counts = players
      .map((player) => `${player.name}${player.id === landlordId ? '★' : ''}: ${player.hand.length}`)
      .join('  ');
    this.hudText.setText(`倍数 ×${multiple} | 当前：${current.name} | 余牌 ${counts}`);
  }

  private renderTablePlay(): void {
    this.tableGroup.clear(true, true);
    const play = this.manager.getTablePlay();
    if (!play) {
      const placeholder = this.add.text(360, 520, '等待出牌', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#94a3b8'
      }).setOrigin(0.5);
      this.tableGroup.add(placeholder);
      return;
    }
    const label = this.add.text(360, 460, `${play.type}`, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#fbbf24'
    }).setOrigin(0.5);
    this.tableGroup.add(label);
    const startX = 360 - ((play.cards.length - 1) * 90) / 2;
    play.cards.forEach((card, index) => {
      const x = startX + index * 90;
      const rect = this.add.rectangle(x, 520, 80, 112, 0xfef3c7, 1);
      rect.setStrokeStyle(2, 0xffffff, 0.7);
      const text = this.add.text(x, 520, formatCard(card), {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#1f2937'
      }).setOrigin(0.5);
      this.tableGroup.addMultiple([rect, text]);
    });
  }

  private renderPlayerHand(): void {
    this.playerHandLayer.removeAll(true);
    const players = this.manager.getPlayers();
    const player = players.find((item) => item.id === 'player-0');
    if (!player) {
      return;
    }
    const hand = [...player.hand];
    hand.sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
    const spacing = hand.length > 1 ? Math.min(60, 560 / (hand.length - 1)) : 0;
    hand.forEach((card, index) => {
      const x = (index - (hand.length - 1) / 2) * spacing;
      const container = this.add.container(x, 0);
      const rect = this.add.rectangle(0, 0, 84, 120, 0xfef3c7, 1);
      rect.setStrokeStyle(3, this.selectedCards.has(card.id) ? 0xf97316 : 0x94a3b8, 1);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.toggleCard(card.id));
      const text = this.add.text(0, 0, formatCard(card), {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#111827'
      }).setOrigin(0.5);
      container.add([rect, text]);
      if (this.selectedCards.has(card.id)) {
        container.y = -40;
      }
      this.playerHandLayer.add(container);
    });
  }

  private toggleCard(cardId: string): void {
    if (this.selectedCards.has(cardId)) {
      this.selectedCards.delete(cardId);
    } else {
      this.selectedCards.add(cardId);
    }
    this.renderPlayerHand();
    this.updateActionAvailability();
  }

  private updateActionAvailability(): void {
    const isPlayerTurn = this.manager.getCurrentPlayer().id === 'player-0';
    const disableColor = 0x475569;
    const controls = [
      this.actionButtons.play,
      this.actionButtons.pass,
      this.actionButtons.hint,
      this.actionButtons.arrange
    ];
    controls.forEach((container) => {
      const rect = container.getData('rect') as Phaser.GameObjects.Rectangle;
      const text = container.getData('text') as Phaser.GameObjects.Text;
      const baseColor = container.getData('color') as number;
      if (isPlayerTurn) {
        rect.setFillStyle(baseColor, 1);
        rect.setInteractive({ useHandCursor: true });
      } else {
        rect.setFillStyle(disableColor, 1);
        rect.disableInteractive();
      }
      const alpha = isPlayerTurn ? 1 : 0.5;
      rect.setAlpha(alpha);
      text.setAlpha(alpha);
    });
  }

  private handlePlay(): void {
    if (this.manager.getCurrentPlayer().id !== 'player-0') {
      return;
    }
    if (this.selectedCards.size === 0) {
      this.showInfo('请选择要出的牌');
      return;
    }
    const selected = Array.from(this.selectedCards);
    const players = this.manager.getPlayers();
    const player = players.find((item) => item.id === 'player-0');
    if (!player) {
      return;
    }
    const cards = player.hand.filter((card) => selected.includes(card.id));
    const combination = analyzeCombination(cards);
    if (!combination) {
      this.showInfo('牌型不合法');
      return;
    }
    try {
      this.manager.playCards('player-0', selected);
      this.selectedCards.clear();
      this.renderState();
      this.processTurn();
    } catch (error) {
      if (error instanceof MatchFinishedError) {
        this.scene.start('SettlementScene', error.result);
        return;
      }
      if (error instanceof Error) {
        this.showInfo(error.message);
      }
    }
  }

  private handlePass(): void {
    if (this.manager.getCurrentPlayer().id !== 'player-0') {
      return;
    }
    try {
      this.manager.pass('player-0');
      this.selectedCards.clear();
      this.renderState();
      this.processTurn();
    } catch (error) {
      if (error instanceof Error) {
        this.showInfo(error.message);
      }
    }
  }

  private handleHint(): void {
    const suggestion = this.manager.suggestPlay('player-0');
    if (!suggestion) {
      this.showInfo('暂无可用提示');
      return;
    }
    this.selectedCards = new Set(suggestion.cards.map((card) => card.id));
    this.renderPlayerHand();
    this.showInfo(`提示：${suggestion.type}`);
  }

  private handleArrange(): void {
    this.manager.rearrangeHand('player-0');
    this.selectedCards.clear();
    this.renderPlayerHand();
    this.showInfo('已重新理牌');
  }

  private showInfo(message: string): void {
    this.infoText.setText(message);
    this.time.delayedCall(1500, () => {
      if (this.infoText.text === message) {
        this.infoText.setText('');
      }
    });
  }

  private processTurn(): void {
    if (this.handlingTurn) {
      return;
    }
    const current = this.manager.getCurrentPlayer();
    if (current.id === 'player-0') {
      this.handlingTurn = false;
      this.updateActionAvailability();
      return;
    }
    this.handlingTurn = true;
    this.time.delayedCall(400, () => this.performAiTurn());
  }

  private performAiTurn(): void {
    try {
      const result = this.manager.aiDecideAndPlay();
      if (result.play) {
        this.showInfo(`${result.player.name} 出了 ${result.play.type}`);
      } else {
        this.showInfo(`${result.player.name} 选择过牌`);
      }
      this.renderState();
      this.handlingTurn = false;
      this.processTurn();
    } catch (error) {
      this.handlingTurn = false;
      if (error instanceof MatchFinishedError) {
        this.scene.start('SettlementScene', error.result);
        return;
      }
      if (error instanceof Error) {
        this.showInfo(error.message);
      }
    }
  }
}
