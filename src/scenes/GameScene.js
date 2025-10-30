import {
  createDeck,
  shuffle,
  deal,
  sortHand,
  removeCardsFromHand,
  evaluateCombination,
  canBeat,
  evaluateLandlord,
  findPlayableCombos,
  formatCombo
} from '../logic/cards.js';

const CARD_WIDTH = 120;
const CARD_HEIGHT = 160;
const PLAYER_SEAT_COUNT = 3;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.players = [];
    this.currentPlayerIndex = 0;
    this.landlordIndex = 0;
    this.lastCombo = null;
    this.lastPlayerIndex = null;
    this.selectedCards = new Set();
    this.statusTexts = [];
    this.roleBadges = [];
    this.aiDelay = 900;
  }

  create() {
    this.createBackground();
    this.createLayoutContainers();
    this.createActionButtons();
    this.createHud();

    this.startNewGame();

    this.scale.on('resize', this.handleResize, this);
    this.handleResize(this.scale.gameSize);
  }

  createBackground() {
    this.tableBackground = this.add
      .rectangle(0, 0, 960, 620, 0x16222a, 0.92)
      .setStrokeStyle(6, 0xf6c667, 0.35);
    this.tableBackground.setOrigin(0.5);

    this.centerPanel = this.add
      .rectangle(0, 0, 580, 260, 0x0b1016, 0.78)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.12);
  }

  createLayoutContainers() {
    this.handsLayer = this.add.container(0, 0);
    this.playerHandLayer = this.add.container(0, 0);
    this.leftHandLayer = this.add.container(0, 0);
    this.rightHandLayer = this.add.container(0, 0);
    this.lastPlayLayer = this.add.container(0, 0);
    this.bottomCardsLayer = this.add.container(0, 0);

    this.handsLayer.add([this.leftHandLayer, this.rightHandLayer, this.playerHandLayer]);
  }

  createActionButtons() {
    this.playButton = this.createTextButton('出牌', () => this.handlePlayAction());
    this.passButton = this.createTextButton('不出', () => this.handlePassAction());
  }

  createHud() {
    this.statusLabel = this.add
      .text(0, 0, '准备发牌…', {
        fontSize: '26px',
        fontFamily: 'Noto Sans SC',
        color: '#f5f5f5',
        fontStyle: '600'
      })
      .setOrigin(0.5);

    this.toastText = this.add
      .text(0, 0, '', {
        fontSize: '28px',
        fontFamily: 'Noto Sans SC',
        color: '#ffe38d',
        fontStyle: '700'
      })
      .setOrigin(0.5)
      .setAlpha(0);

    for (let i = 0; i < PLAYER_SEAT_COUNT; i += 1) {
      const status = this.add
        .text(0, 0, '', {
          fontSize: '22px',
          fontFamily: 'Noto Sans SC',
          color: '#f5f5f5'
        })
        .setOrigin(0.5);
      this.statusTexts.push(status);

      const badge = this.add
        .text(0, 0, '', {
          fontSize: '24px',
          fontFamily: 'Noto Sans SC',
          color: '#f6c667',
          fontStyle: '700'
        })
        .setOrigin(0.5);
      this.roleBadges.push(badge);
    }
  }

  startNewGame() {
    this.clearSelection();
    if (this.gameOverOverlay) {
      this.gameOverOverlay.destroy();
      this.gameOverOverlay = null;
    }

    const deck = shuffle(createDeck());
    const { players, landlordCards } = deal(deck);
    const landlordIndex = evaluateLandlord(players);

    players[landlordIndex].push(...landlordCards);
    sortHand(players[landlordIndex]);

    this.players = [
      { name: '你', hand: players[0], isHuman: true, role: 'farmer' },
      { name: '左家', hand: players[1], isHuman: false, role: 'farmer' },
      { name: '右家', hand: players[2], isHuman: false, role: 'farmer' }
    ];

    this.landlordIndex = landlordIndex;
    this.players[landlordIndex].role = 'landlord';

    this.landlordCards = sortHand([...landlordCards]);
    this.currentPlayerIndex = landlordIndex;
    this.lastCombo = null;
    this.lastPlayerIndex = landlordIndex;
    this.lastPlayLayer.removeAll(true);
    this.bottomCardsLayer.removeAll(true);
    this.statusTexts.forEach((label) => label.setText(''));

    this.renderHands();
    this.renderBottomCards();
    this.updateRoleBadges();
    this.updateStatusLabel(`${this.players[landlordIndex].name} 获得地主`);
    this.updateButtons();

    if (!this.players[this.currentPlayerIndex].isHuman) {
      this.time.delayedCall(this.aiDelay, () => this.takeAiTurn());
    }
  }

  renderHands() {
    this.renderPlayerHand();
    this.renderOpponentHand(1, this.leftHandLayer, true);
    this.renderOpponentHand(2, this.rightHandLayer, false);
  }

  renderPlayerHand() {
    this.playerHandLayer.removeAll(true);
    const player = this.players[0];
    const { width } = this.scale.gameSize;
    const hand = player.hand;
    const spacing = Math.min(92, hand.length > 1 ? (width - 220) / (hand.length - 1) : 0);
    const startX = width / 2 - ((hand.length - 1) * spacing) / 2;
    const y = this.scale.gameSize.height - 170;

    hand.forEach((card, index) => {
      const cardContainer = this.createCard(card, true);
      cardContainer.x = startX + index * spacing;
      cardContainer.y = y;
      cardContainer.baseY = y;
      cardContainer.cardIndex = index;
      cardContainer.isSelected = false;
      cardContainer.setInteractive({ useHandCursor: true });
      cardContainer.on('pointerdown', () => this.toggleCardSelection(cardContainer));
      this.playerHandLayer.add(cardContainer);
    });
  }

  renderOpponentHand(playerIndex, container, isLeft) {
    container.removeAll(true);
    const player = this.players[playerIndex];
    const count = player.hand.length;
    const stack = this.add.container(0, 0);
    const offset = 18;
    const depthCount = Math.min(count, 5);

    for (let i = 0; i < depthCount; i += 1) {
      const rect = this.add.rectangle(
        isLeft ? -i * offset : i * offset,
        -i * 4,
        60,
        90,
        0x19323b,
        0.92
      );
      rect.setStrokeStyle(2, 0xf6c667, 0.4);
      rect.setOrigin(0.5);
      stack.add(rect);
    }

    const label = this.add
      .text(0, 70, `${player.name}\n余牌 ${count}`, {
        fontSize: '20px',
        fontFamily: 'Noto Sans SC',
        align: 'center',
        color: '#f5f5f5'
      })
      .setOrigin(0.5);

    stack.add(label);
    container.add(stack);
  }

  renderBottomCards() {
    this.bottomCardsLayer.removeAll(true);
    if (!this.landlordCards) return;
    const spacing = 140;
    const title = this.add
      .text(0, -110, '底牌', {
        fontSize: '24px',
        fontFamily: 'Noto Sans SC',
        color: '#f5f5f5',
        fontStyle: '600'
      })
      .setOrigin(0.5);
    this.bottomCardsLayer.add(title);
    this.landlordCards.forEach((card, index) => {
      const cardSprite = this.createCard(card, true, 0.85);
      cardSprite.x = -spacing + index * spacing;
      cardSprite.y = 0;
      this.bottomCardsLayer.add(cardSprite);
    });
  }

  createCard(card, faceUp = true, scale = 1) {
    const container = this.add.container(0, 0);
    const width = CARD_WIDTH * scale;
    const height = CARD_HEIGHT * scale;

    const bgColor = faceUp ? 0xfefefe : 0x17313b;
    const borderColor = card.isJoker ? 0xf6c667 : 0xffffff;

    const rect = this.add.rectangle(0, 0, width, height, bgColor, faceUp ? 1 : 0.9);
    rect.setStrokeStyle(3, borderColor, 0.8);
    rect.setOrigin(0.5);
    container.add(rect);

    if (faceUp) {
      const rankText = this.add
        .text(-width / 2 + 16, -height / 2 + 14, card.rank, {
          fontSize: `${Math.round(28 * scale)}px`,
          fontFamily: 'Noto Sans SC',
          color: card.isJoker ? '#d97706' : card.color,
          fontStyle: '700'
        })
        .setOrigin(0, 0);

      const suitText = this.add
        .text(width / 2 - 18, height / 2 - 18, card.isJoker ? '★' : card.suit, {
          fontSize: `${Math.round(32 * scale)}px`,
          fontFamily: 'Noto Sans SC',
          color: card.isJoker ? '#d97706' : card.color
        })
        .setOrigin(1, 1);

      const centerText = this.add
        .text(0, 8 * scale, card.isJoker ? card.label : card.suit.repeat(2), {
          fontSize: `${Math.round(36 * scale)}px`,
          fontFamily: 'Noto Sans SC',
          color: card.isJoker ? '#d97706' : card.color
        })
        .setOrigin(0.5);

      container.add([rankText, suitText, centerText]);
    }

    container.card = card;
    container.faceUp = faceUp;
    return container;
  }

  toggleCardSelection(cardContainer) {
    if (this.gameOverOverlay) return;
    if (!cardContainer.faceUp) return;
    cardContainer.isSelected = !cardContainer.isSelected;
    const targetY = cardContainer.baseY + (cardContainer.isSelected ? -26 : 0);
    this.tweens.add({
      targets: cardContainer,
      y: targetY,
      duration: 160,
      ease: 'Sine.easeOut'
    });
    if (cardContainer.isSelected) {
      this.selectedCards.add(cardContainer.card.id);
    } else {
      this.selectedCards.delete(cardContainer.card.id);
    }
  }

  getSelectedCards() {
    const player = this.players[0];
    const ids = this.selectedCards;
    return player.hand.filter((card) => ids.has(card.id));
  }

  clearSelection() {
    this.selectedCards.clear();
  }

  createTextButton(label, handler) {
    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 150, 54, 0xf6c667, 0.92);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.6);

    const text = this.add
      .text(0, 0, label, {
        fontSize: '24px',
        fontFamily: 'Noto Sans SC',
        color: '#1b1b1b',
        fontStyle: '700'
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.bg = bg;
    container.setSize(150, 54);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      if (!container.enabled) return;
      handler();
    });
    container.on('pointerover', () => {
      if (!container.enabled) return;
      bg.setFillStyle(0xffdfa0, 1);
    });
    container.on('pointerout', () => {
      bg.setFillStyle(0xf6c667, 0.92);
    });
    container.enabled = true;
    return container;
  }

  setButtonEnabled(button, enabled) {
    button.enabled = enabled;
    button.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      button.setInteractive({ useHandCursor: true });
    } else {
      button.disableInteractive();
    }
  }

  updateButtons() {
    const playerTurn = this.currentPlayerIndex === 0 && !this.gameOverOverlay;
    this.setButtonEnabled(this.playButton, playerTurn);
    this.setButtonEnabled(this.passButton, playerTurn);
  }

  handlePlayAction() {
    if (this.currentPlayerIndex !== 0) return;
    const selected = this.getSelectedCards();
    if (selected.length === 0) {
      this.showToast('请先选择要出的牌');
      return;
    }
    const combo = evaluateCombination(selected);
    if (!combo) {
      this.showToast('当前选择无法组成合法牌型');
      return;
    }
    if (this.lastCombo && this.lastPlayerIndex !== 0 && !canBeat(combo, this.lastCombo)) {
      this.showToast('牌力不足，无法压过上一手');
      return;
    }
    this.commitPlay(0, combo);
  }

  handlePassAction() {
    if (this.currentPlayerIndex !== 0) return;
    if (!this.lastCombo || this.lastPlayerIndex === 0) {
      this.showToast('本轮由你先手，不能不出');
      return;
    }
    this.statusTexts[0].setText('不出');
    this.clearSelection();
    this.renderPlayerHand();
    this.advanceTurn();
  }

  commitPlay(playerIndex, combo) {
    const player = this.players[playerIndex];
    player.hand = removeCardsFromHand(player.hand, combo.cards);
    sortHand(player.hand);
    this.lastCombo = combo;
    this.lastPlayerIndex = playerIndex;
    this.clearSelection();
    this.renderHands();
    this.renderLastPlay(playerIndex, combo);
    this.statusTexts[playerIndex].setText(formatCombo(combo));

    if (player.hand.length === 0) {
      this.endGame(playerIndex);
      return;
    }

    this.advanceTurn();
  }

  renderLastPlay(playerIndex, combo) {
    this.lastPlayLayer.removeAll(true);
    if (!combo) {
      const text = this.add
        .text(0, 0, `${this.players[playerIndex].name} 选择不出`, {
          fontSize: '24px',
          fontFamily: 'Noto Sans SC',
          color: '#f5f5f5'
        })
        .setOrigin(0.5);
      this.lastPlayLayer.add(text);
      return;
    }

    const spacing = 90;
    combo.cards
      .slice()
      .sort((a, b) => b.value - a.value)
      .forEach((card, index) => {
        const cardSprite = this.createCard(card, true, 0.9);
        cardSprite.x = (index - (combo.cards.length - 1) / 2) * spacing;
        cardSprite.y = 0;
        this.lastPlayLayer.add(cardSprite);
      });
  }

  advanceTurn() {
    if (this.gameOverOverlay) return;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % PLAYER_SEAT_COUNT;

    if (this.currentPlayerIndex === this.lastPlayerIndex) {
      this.lastCombo = null;
      this.statusTexts.forEach((label) => label.setText(''));
      this.lastPlayLayer.removeAll(true);
      this.updateStatusLabel(`${this.players[this.currentPlayerIndex].name} 获得出牌权`);
    }

    this.updateButtons();

    if (this.players[this.currentPlayerIndex].isHuman) {
      this.updateStatusLabel('轮到你出牌');
    } else {
      this.updateStatusLabel(`等待 ${this.players[this.currentPlayerIndex].name} 思考…`);
      this.time.delayedCall(this.aiDelay, () => this.takeAiTurn());
    }
  }

  takeAiTurn() {
    if (this.gameOverOverlay) return;
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];
    if (player.isHuman) return;

    let combo = null;
    const playable = findPlayableCombos(player.hand, this.lastCombo);
    if (!this.lastCombo || this.lastPlayerIndex === playerIndex) {
      combo = this.chooseLeadCombo(playable);
    } else {
      combo = playable[0] || null;
      if (!combo) {
        this.statusTexts[playerIndex].setText('不出');
        this.renderLastPlay(playerIndex, null);
        this.advanceTurn();
        return;
      }
    }

    if (combo) {
      this.commitPlay(playerIndex, combo);
    } else {
      this.statusTexts[playerIndex].setText('不出');
      this.renderLastPlay(playerIndex, null);
      this.advanceTurn();
    }
  }

  chooseLeadCombo(playable) {
    if (!playable || playable.length === 0) return null;
    const sorted = playable.sort((a, b) => a.cards.length - b.cards.length || a.rank - b.rank);
    // Prefer to shed rockets/bombs later
    const filtered = sorted.filter(
      (combo) => combo.type !== 'rocket' && combo.type !== 'bomb'
    );
    if (filtered.length > 0) {
      return filtered[0];
    }
    return sorted[0];
  }

  endGame(winnerIndex) {
    this.gameOverOverlay = this.add.container(
      this.scale.gameSize.width / 2,
      this.scale.gameSize.height / 2
    );

    const width = Math.min(520, this.scale.gameSize.width - 80);
    const height = 260;

    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.78);
    bg.setStrokeStyle(3, 0xf6c667, 0.6);
    bg.setOrigin(0.5);

    const title = this.add
      .text(0, -60, this.players[winnerIndex].isHuman ? '恭喜，你赢啦！' : '很遗憾，被地主压制了…', {
        fontSize: '32px',
        fontFamily: 'Noto Sans SC',
        color: '#ffe38d',
        fontStyle: '700'
      })
      .setOrigin(0.5);

    const detail = this.add
      .text(0, 0, `赢家：${this.players[winnerIndex].name}`, {
        fontSize: '24px',
        fontFamily: 'Noto Sans SC',
        color: '#f5f5f5'
      })
      .setOrigin(0.5);

    const button = this.createTextButton('再来一局', () => {
      this.startNewGame();
    });
    button.y = 70;

    this.gameOverOverlay.add([bg, title, detail, button]);
    this.updateButtons();
  }

  updateRoleBadges() {
    this.players.forEach((player, index) => {
      this.roleBadges[index].setText(player.role === 'landlord' ? '地主' : '农民');
      this.roleBadges[index].setColor(player.role === 'landlord' ? '#f6c667' : '#9ca3af');
    });
  }

  updateStatusLabel(text) {
    this.statusLabel.setText(text);
  }

  showToast(message) {
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 2200,
      ease: 'Quad.easeOut',
      delay: 200
    });
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.tableBackground.setPosition(width / 2, height / 2);
    this.tableBackground.width = Math.min(width - 40, 1040);
    this.tableBackground.height = Math.min(height - 60, 660);

    this.centerPanel.setPosition(width / 2, height / 2 - 30);

    this.playerHandLayer.setPosition(0, 0);
    this.leftHandLayer.setPosition(width * 0.15, height * 0.36);
    this.rightHandLayer.setPosition(width * 0.85, height * 0.36);
    this.lastPlayLayer.setPosition(width / 2, height / 2 - 40);
    this.bottomCardsLayer.setPosition(width / 2, height * 0.25);

    this.playButton.setPosition(width / 2 + 150, height - 90);
    this.passButton.setPosition(width / 2 - 150, height - 90);

    this.statusLabel.setPosition(width / 2, height - 38);
    this.toastText.setPosition(width / 2, height / 2 - 150);

    const statusPositions = [
      { x: width / 2, y: height - 220 },
      { x: width * 0.18, y: height * 0.18 },
      { x: width * 0.82, y: height * 0.18 }
    ];

    statusPositions.forEach((pos, index) => {
      this.statusTexts[index].setPosition(pos.x, pos.y);
      this.roleBadges[index].setPosition(pos.x, pos.y - 40);
    });

    if (this.gameOverOverlay) {
      this.gameOverOverlay.setPosition(width / 2, height / 2);
    }

    this.renderPlayerHand();
    this.renderOpponentHand(1, this.leftHandLayer, true);
    this.renderOpponentHand(2, this.rightHandLayer, false);
    this.renderBottomCards();
  }
}
