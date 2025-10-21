const GAMES = [
  {
    id: 'gomoku',
    name: 'Gomoku',
    displayName: '五子棋',
    description: '15x15 棋盘，连五取胜。',
    genre: ['board', 'abstract'],
    tags: ['pvp', 'fast'],
    minPlayers: 2,
    maxPlayers: 2,
    matchPlayers: 2,
    turnOrder: 'sequential',
    rulesVersion: 'v1',
    assets: {
      board: 'board-15x15',
      theme: 'classic-dark'
    },
    metadata: {
      boardSize: 15,
      firstMove: 'black',
      timeLimitSeconds: 45
    }
  },
  {
    id: 'doudizhu',
    name: 'Fight the Landlord',
    displayName: '斗地主',
    description: '三人对战，先出完手牌获胜。',
    genre: ['card', 'trick'],
    tags: ['pvp', 'casual'],
    minPlayers: 3,
    maxPlayers: 3,
    matchPlayers: 3,
    turnOrder: 'sequential',
    rulesVersion: 'training-v1',
    assets: {
      cardBack: 'cardback-red',
      table: 'table-green'
    },
    metadata: {
      deck: 54,
      landlordSeat: 0,
      timeLimitSeconds: 60
    }
  },
  {
    id: 'texas_holdem',
    name: 'Texas Hold’em',
    displayName: '德州扑克',
    description: '公共牌德州桌，支持 2-6 人对局。',
    genre: ['card', 'poker'],
    tags: ['pvp', 'strategy'],
    minPlayers: 2,
    maxPlayers: 6,
    matchPlayers: 6,
    turnOrder: 'sequential',
    rulesVersion: 'training-v1',
    assets: {
      cardBack: 'cardback-blue',
      table: 'table-dark'
    },
    metadata: {
      deck: 52,
      buyIn: 1000,
      timeLimitSeconds: 75
    }
  },
  {
    id: 'chinese_chess',
    name: 'Chinese Chess',
    displayName: '中国象棋',
    description: '楚河汉界，先将死对方为胜。',
    genre: ['board', 'strategy'],
    tags: ['pvp', 'classic'],
    minPlayers: 2,
    maxPlayers: 2,
    matchPlayers: 2,
    turnOrder: 'sequential',
    rulesVersion: 'training-v1',
    assets: {
      board: 'cchess-board',
      theme: 'red-black'
    },
    metadata: {
      boardSize: '9x10',
      firstMove: 'red',
      timeLimitSeconds: 120
    }
  },
  {
    id: 'chess',
    name: 'Chess',
    displayName: '国际象棋',
    description: '标准 8x8 棋盘，击败对方国王。',
    genre: ['board', 'strategy'],
    tags: ['pvp', 'classic'],
    minPlayers: 2,
    maxPlayers: 2,
    matchPlayers: 2,
    turnOrder: 'sequential',
    rulesVersion: 'training-v1',
    assets: {
      board: 'chess-board',
      theme: 'light-dark'
    },
    metadata: {
      boardSize: '8x8',
      firstMove: 'white',
      timeLimitSeconds: 120
    }
  }
];

const GAME_META = {
  gomoku: {
    summary: '15x15 棋盘，执黑者先行，连五即胜。',
    seats: [
      { seat: 0, label: '执黑', stone: 'black' },
      { seat: 1, label: '执白', stone: 'white' }
    ],
    flow: ['等待准备', '实战对局', '连五胜出或平局'],
    ui: {
      board: 'grid-15',
      moveNotation: 'coordinates'
    }
  },
  doudizhu: {
    summary: '地主 VS. 农民团队，率先打完所有牌获胜。',
    seats: [
      { seat: 0, label: '地主', role: 'landlord' },
      { seat: 1, label: '农民', role: 'farmer' },
      { seat: 2, label: '农民', role: 'farmer' }
    ],
    flow: ['发牌', '轮流出牌/过牌', '一方出完牌或宣布胜利'],
    ui: {
      handFan: true,
      trickTimeline: true,
      highlightLandlord: true
    }
  },
  texas_holdem: {
    summary: '德州桌支持最多 6 名玩家，公共牌逐街翻开。',
    seats: Array.from({ length: 6 }, (_, index) => ({
      seat: index,
      label: index === 0 ? '庄家' : `席位 ${index + 1}`,
      role: index === 0 ? 'dealer' : 'player'
    })),
    flow: ['Preflop', 'Flop', 'Turn', 'River', '摊牌或认输'],
    ui: {
      communityCards: true,
      stackDisplay: true,
      potDisplay: true
    }
  },
  chinese_chess: {
    summary: '楚河汉界、兵卒推进，吃掉对方“将/帅”即胜。',
    seats: [
      { seat: 0, label: '红方', color: 'red' },
      { seat: 1, label: '黑方', color: 'black' }
    ],
    flow: ['排兵布阵', '轮流走子', '吃掉对方将帅胜利'],
    ui: {
      board: 'river-board',
      notation: 'grid9x10'
    }
  },
  chess: {
    summary: '国际象棋标准布局，白先黑后。',
    seats: [
      { seat: 0, label: '白方', color: 'white' },
      { seat: 1, label: '黑方', color: 'black' }
    ],
    flow: ['布阵', '轮流走子', '吃掉国王或宣告胜利'],
    ui: {
      board: '8x8',
      notation: 'algebraic'
    }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listGames() {
  return GAMES.map((game) => clone(game));
}

function getGameById(id) {
  return GAMES.find((game) => game.id === id) || null;
}

function getGameMeta(id) {
  const base = getGameById(id);
  if (!base) {
    return null;
  }
  const detail = GAME_META[id] || {};
  return {
    ...clone(base),
    ...clone(detail)
  };
}

module.exports = {
  listGames,
  getGameById,
  getGameMeta
};
