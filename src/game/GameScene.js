import {
  createDeck,
  shuffle,
  dealPlayers,
  sortHand,
  evaluateCombo,
  canBeat,
  describeCombo,
  findBestPlay,
  removeCardsFromHand,
} from './CardUtils.js';

const PLAYER_POSITIONS = ['bottom', 'left', 'right'];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.players = [];
    this.currentPlayerIndex = 0;
    this.landlordIndex = 0;
    this.lastCombo = null;
    this.lastPlayerIndex = null;
    this.passStreak = 0;
    this.selectedCardIds = new Set();
    this.tableGroup = null;
    this.backgroundGraphics = null;
    this.tableCards = [];
  }

  create() {
    this.createBackground();
    const { width, height } = this.scale;
    this.statusText = this.add.text(width / 2, height - 40, '', {
      fontSize: '20px',
      color: '#fdfdfd',
    }).setOrigin(0.5, 0.5);

    this.lastPlayText = this.add.text(width / 2, height / 2 + 140, '', {
      fontSize: '18px',
      color: '#fdd835',
    }).setOrigin(0.5, 0.5);
    this.createUI();
    this.startNewGame();
    this.scale.on('resize', this.handleResize, this);
  }

  createBackground() {
    const { width, height } = this.scale;
    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
    }
    if (this.tableGroup) {
      this.tableGroup.destroy(true);
    }

    this.backgroundGraphics = this.add.graphics();
    this.backgroundGraphics.fillGradientStyle(0x142850, 0x27496d, 0x142850, 0x0c1b33);
    this.backgroundGraphics.fillRect(0, 0, width, height);

    this.tableGroup = this.add.container(width / 2, height / 2);
  }

  createUI() {
    const { width, height } = this.scale;
    this.buttons = this.add.container(width / 2, height - 90);

    this.playButton = this.createButton('出牌', 0, 0, () => this.onPlayerPlay());
    this.passButton = this.createButton('不出', -150, 0, () => this.onPlayerPass());
    this.tipButton = this.createButton('提示', 150, 0, () => this.onHint());

    this.buttons.add([this.playButton, this.passButton, this.tipButton]);
    this.setPlayerControlsEnabled(false);

    this.landlordFlagText = this.add.text(width / 2, height / 2, '地主', {
      fontSize: '20px',
      color: '#ffeb3b',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.landlordFlagText.setVisible(false);
  }

  createButton(label, offsetX, offsetY, callback) {
    const container = this.add.container(offsetX, offsetY);
    const background = this.add.rectangle(0, 0, 120, 44, 0xf9a825, 0.9);
    background.setStrokeStyle(2, 0xffc107);
    const text = this.add.text(0, 0, label, {
      fontSize: '20px',
      color: '#1b1b1b',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    background.setInteractive({ useHandCursor: true }).on('pointerdown', callback);
    background.on('pointerover', () => background.setFillStyle(0xffc107, 1));
    background.on('pointerout', () => background.setFillStyle(0xf9a825, 0.9));
    container.add([background, text]);
    return container;
  }

  startNewGame() {
    this.clearTable();
    this.players = PLAYER_POSITIONS.map((position, index) => ({
      id: index,
      position,
      isHuman: position === 'bottom',
      hand: [],
      label: position === 'bottom' ? '你' : index === 1 ? '左家' : '右家',
      cardNodes: [],
      infoText: null,
    }));

    const deck = shuffle(createDeck());
    const { players, landlordCards } = dealPlayers(deck);
    players.forEach((hand, idx) => {
      this.players[idx].hand = sortHand(hand);
    });
    this.landlordIndex = this.chooseLandlord();
    this.players[this.landlordIndex].hand = sortHand([
      ...this.players[this.landlordIndex].hand,
      ...landlordCards,
    ]);

    this.selectedCardIds.clear();
    this.currentPlayerIndex = this.landlordIndex;
    this.lastCombo = null;
    this.lastPlayerIndex = null;
    this.passStreak = 0;

    this.renderHands();
    this.renderLandlordFlag();
    this.updateStatus(`地主：${this.players[this.landlordIndex].label}`);

    this.time.delayedCall(700, () => this.takeTurn(), [], this);
  }

  chooseLandlord() {
    const bids = this.players.map(() => Math.random());
    let maxBid = -1;
    let landlord = 0;
    bids.forEach((bid, idx) => {
      if (bid > maxBid) {
        maxBid = bid;
        landlord = idx;
      }
    });
    return landlord;
  }

  renderHands() {
    this.players.forEach((player) => {
      if (player.cardNodes) {
        player.cardNodes.forEach((node) => node.destroy());
        player.cardNodes = [];
      }
      if (player.infoText) {
        player.infoText.destroy();
        player.infoText = null;
      }
      this.renderHandForPlayer(player);
    });
  }

  renderHandForPlayer(player) {
    const { width, height } = this.scale;
    const hand = player.hand;
    if (player.isHuman) {
      const startX = width / 2 - (hand.length - 1) * 30;
      const y = height - 160;
      hand.forEach((card, index) => {
        const cardNode = this.createCardNode(card, startX + index * 60, y);
        player.cardNodes.push(cardNode);
      });
    } else if (player.position === 'left') {
      const startY = height / 2 + 40;
      const x = 120;
      hand.forEach((card, index) => {
        const cardNode = this.createBackCard(x, startY - index * 30);
        player.cardNodes.push(cardNode);
      });
    } else {
      const startY = height / 2 + 40;
      const x = width - 120;
      hand.forEach((card, index) => {
        const cardNode = this.createBackCard(x, startY - index * 30);
        player.cardNodes.push(cardNode);
      });
    }
    const infoPos = this.getInfoPosition(player.position);
    player.infoText = this.add.text(infoPos.x, infoPos.y, `${player.label}：${hand.length}张`, {
      fontSize: '18px',
      color: '#f5f5f5',
    }).setOrigin(0.5, 0.5);
  }

  getInfoPosition(position) {
    const { width, height } = this.scale;
    if (position === 'bottom') {
      return { x: width / 2, y: height - 210 };
    }
    if (position === 'left') {
      return { x: 100, y: height / 2 + 120 };
    }
    return { x: width - 100, y: height / 2 + 120 };
  }

  createCardNode(card, x, y) {
    const container = this.add.container(x, y);
    const border = this.add.rectangle(0, 0, 86, 116, 0x000000, 0.25);
    border.setStrokeStyle(2, 0xf57f17, 0.8);
    const background = this.add.rectangle(0, 0, 80, 110, 0xffffff, 0.95);
    container.add([border, background]);
    const color = card.suit === '♥' || card.suit === '♦' ? '#d32f2f' : '#1b1b1b';
    const text = this.add.text(0, -10, card.rank, {
      fontSize: '28px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    const suitText = this.add.text(0, 20, card.suit === 'JOKER' ? card.rank : card.suit, {
      fontSize: '22px',
      color,
    }).setOrigin(0.5, 0.5);
    container.add([text, suitText]);
    container.setSize(80, 110);
    background.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.isPlayerTurn()) {
        return;
      }
      if (this.selectedCardIds.has(card.id)) {
        this.selectedCardIds.delete(card.id);
        this.tweens.add({
          targets: container,
          y,
          duration: 120,
          ease: 'Cubic.easeOut',
        });
      } else {
        this.selectedCardIds.add(card.id);
        this.tweens.add({
          targets: container,
          y: y - 30,
          duration: 120,
          ease: 'Cubic.easeOut',
        });
      }
    });
    return container;
  }

  createBackCard(x, y) {
    const container = this.add.container(x, y);
    const border = this.add.rectangle(0, 0, 76, 106, 0x000000, 0.3);
    border.setStrokeStyle(2, 0xf9a825, 0.7);
    const back = this.add.rectangle(0, 0, 70, 100, 0x394867, 0.95);
    container.add([border, back]);
    return container;
  }

  renderLandlordFlag() {
    const landlord = this.players[this.landlordIndex];
    const pos = this.getInfoPosition(landlord.position);
    this.landlordFlagText.setPosition(pos.x, pos.y - 30);
    this.landlordFlagText.setVisible(true);
  }

  clearTable() {
    if (this.tableGroup) {
      this.tableGroup.removeAll(true);
    }
    this.tableCards = [];
  }

  updateStatus(text) {
    this.statusText.setText(text);
  }

  takeTurn() {
    if (this.checkGameOver()) {
      return;
    }
    const player = this.players[this.currentPlayerIndex];
    if (player.isHuman) {
      this.setPlayerControlsEnabled(true);
      this.updateStatus(`轮到你出牌（剩余 ${player.hand.length} 张）`);
    } else {
      this.setPlayerControlsEnabled(false);
      this.updateStatus(`${player.label} 思考中…`);
      this.time.delayedCall(900, () => this.aiPlay(player), [], this);
    }
  }

  setPlayerControlsEnabled(enabled) {
    this.playButton.setVisible(enabled);
    this.passButton.setVisible(enabled);
    this.tipButton.setVisible(enabled);
  }

  isPlayerTurn() {
    return this.players[this.currentPlayerIndex].isHuman;
  }

  onPlayerPlay() {
    const player = this.players[this.currentPlayerIndex];
    if (!player.isHuman) {
      return;
    }
    const selectedCards = player.hand.filter((card) => this.selectedCardIds.has(card.id));
    if (selectedCards.length === 0) {
      this.flashStatus('请选择要出的牌');
      return;
    }
    const combo = evaluateCombo(selectedCards);
    if (!combo) {
      this.flashStatus('无法识别的牌型');
      return;
    }
    if (!canBeat(combo, this.lastCombo)) {
      this.flashStatus('当前牌型无法压过对手');
      return;
    }
    this.playCards(selectedCards, combo);
  }

  onPlayerPass() {
    const player = this.players[this.currentPlayerIndex];
    if (!player.isHuman) {
      return;
    }
    if (!this.lastCombo || this.lastPlayerIndex === this.currentPlayerIndex) {
      this.flashStatus('首家必须出牌');
      return;
    }
    this.passTurn(player);
  }

  onHint() {
    const player = this.players[this.currentPlayerIndex];
    if (!player.isHuman) {
      return;
    }
    const suggestion = findBestPlay(player.hand, this.lastCombo);
    if (!suggestion) {
      this.flashStatus('无牌可出，请选择不出');
      return;
    }
    this.selectedCardIds = new Set(suggestion.cards.map((card) => card.id));
    this.updatePlayerSelection();
  }

  updatePlayerSelection() {
    const player = this.players[this.currentPlayerIndex];
    player.cardNodes.forEach((node, index) => {
      const card = player.hand[index];
      const y = this.scale.height - 160;
      const targetY = this.selectedCardIds.has(card.id) ? y - 30 : y;
      this.tweens.add({
        targets: node,
        y: targetY,
        duration: 120,
        ease: 'Cubic.easeOut',
      });
    });
  }

  playCards(cards, combo) {
    const player = this.players[this.currentPlayerIndex];
    player.hand = sortHand(removeCardsFromHand(player.hand, cards));
    this.selectedCardIds.clear();
    this.renderHands();
    this.renderTableCards(cards);
    this.lastCombo = combo;
    this.lastPlayerIndex = this.currentPlayerIndex;
    this.passStreak = 0;
    this.updateStatus(`${player.label} 出牌：${describeCombo(combo, cards)}`);
    this.lastPlayText.setText(describeCombo(combo, cards));
    if (player.hand.length === 0) {
      this.handleGameEnd(player);
      return;
    }
    this.advanceTurn();
  }

  renderTableCards(cards) {
    this.clearTable();
    this.tableCards = cards.map((card) => ({ ...card }));
    const spacing = 70;
    const offsetX = -((cards.length - 1) * spacing) / 2;
    cards
      .slice()
      .sort((a, b) => a.value - b.value)
      .forEach((card, index) => {
        const container = this.add.container(offsetX + index * spacing, 0);
        const border = this.add.rectangle(0, 0, 78, 106, 0x000000, 0.3);
        border.setStrokeStyle(2, 0xf57f17, 0.7);
        const back = this.add.rectangle(0, 0, 72, 100, 0xffffff, 0.95);
        const color = card.suit === '♥' || card.suit === '♦' ? '#d32f2f' : '#1b1b1b';
        const rankText = this.add.text(0, -12, card.rank, {
          fontSize: '24px',
          color,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);
        const suitText = this.add.text(0, 16, card.suit === 'JOKER' ? card.rank : card.suit, {
          fontSize: '20px',
          color,
        }).setOrigin(0.5, 0.5);
        container.add([border, back, rankText, suitText]);
        this.tableGroup.add(container);
      });
    this.lastPlayText.setText(cards.length ? cards.map((card) => card.label).join(' ') : '');
  }

  advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.lastPlayerIndex === this.currentPlayerIndex) {
      this.lastCombo = null;
      this.lastPlayerIndex = null;
      this.passStreak = 0;
      this.lastPlayText.setText('');
      this.clearTable();
    }
    this.time.delayedCall(600, () => this.takeTurn(), [], this);
  }

  passTurn(player) {
    this.updateStatus(`${player.label} 选择不出`);
    this.passStreak += 1;
    this.lastPlayText.setText(`${player.label} 不出`);
    this.advanceTurn();
  }

  aiPlay(player) {
    const decision = findBestPlay(player.hand, this.lastCombo);
    if (!decision) {
      this.passTurn(player);
      return;
    }
    this.playCards(decision.cards, decision.combo);
  }

  flashStatus(text) {
    this.statusText.setText(text);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0.2,
      duration: 120,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.statusText.setAlpha(1),
    });
  }

  checkGameOver() {
    const winner = this.players.find((player) => player.hand.length === 0);
    if (winner) {
      this.handleGameEnd(winner);
      return true;
    }
    return false;
  }

  handleGameEnd(winner) {
    this.setPlayerControlsEnabled(false);
    const message = winner.isHuman ? '恭喜，你赢了！' : `${winner.label} 获胜`;
    this.updateStatus(message);
    this.lastPlayText.setText('点击任意位置重新开始');
    this.input.once('pointerdown', () => this.startNewGame());
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);
    this.createBackground();
    this.statusText.setPosition(width / 2, height - 40);
    this.lastPlayText.setPosition(width / 2, height / 2 + 140);
    this.buttons.setPosition(width / 2, height - 90);
    this.landlordFlagText.setPosition(width / 2, height / 2);
    this.renderHands();
    this.renderLandlordFlag();
    if (this.tableCards.length > 0) {
      this.renderTableCards(this.tableCards);
    }
  }
}
