export type GameDiscipline = 'texas-holdem' | 'doudizhu' | 'xiangqi' | 'go';

export type GameDefinition = {
  id: GameDiscipline;
  name: string;
  tagline: string;
  theme: 'neon' | 'jade' | 'imperial' | 'zen';
  minPlayers: number;
  maxPlayers: number;
  recommendedOrientation: 'landscape';
  cover: string;
  board: string;
  features: string[];
  actions: string[];
  tutorial: string[];
  rankingRules: string[];
};

const assetUrls = {
  coverTexas:
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  boardTexas:
    'https://images.unsplash.com/photo-1518544889280-9eead03f1a48?auto=format&fit=crop&w=1600&q=80',
  coverDoudizhu:
    'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  boardDoudizhu:
    'https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=1600&q=80',
  coverXiangqi:
    'https://images.unsplash.com/photo-1507835661120-30e665aeb79b?auto=format&fit=crop&w=1200&q=80',
  boardXiangqi:
    'https://images.unsplash.com/photo-1519162584292-56dfc9eb5db4?auto=format&fit=crop&w=1600&q=80',
  coverGo:
    'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80',
  boardGo:
    'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1600&q=80'
} as const;

export const gameCatalog: GameDefinition[] = [
  {
    id: 'texas-holdem',
    name: '德州扑克',
    tagline: '深色霓虹赛博赛场，感受高压筹码对决',
    theme: 'neon',
    minPlayers: 2,
    maxPlayers: 9,
    recommendedOrientation: 'landscape',
    cover: assetUrls.coverTexas,
    board: assetUrls.boardTexas,
    features: ['盲注节奏可调', '多重筹码池演算', '全程回放加书签'],
    actions: ['跟注', '加注', '全下', '弃牌'],
    tutorial: ['理解盲注和前注节奏', '学会翻牌、转牌和河牌的决策差异', '掌握 Time Bank 的高效使用'],
    rankingRules: ['采用 MMR + 筹码收益双计分', '弃权将触发保底扣分', '赛季内 All-in 扑克手记可复盘']
  },
  {
    id: 'doudizhu',
    name: '斗地主',
    tagline: '经典玩法以蒸汽朋克演出重制，叫抢尽显气势',
    theme: 'jade',
    minPlayers: 3,
    maxPlayers: 3,
    recommendedOrientation: 'landscape',
    cover: assetUrls.coverDoudizhu,
    board: assetUrls.boardDoudizhu,
    features: ['多段叫牌语音演出', '炸弹/火箭粒子特效', '断线重连保留手牌顺序'],
    actions: ['叫地主', '抢地主', '加倍', '明牌'],
    tutorial: ['叫牌策略入门', '明牌 VS 暗牌的收益分析', '春天/反春天触发条件'],
    rankingRules: ['春天翻倍演出', '逃跑自动托管扣分', '地区榜采用 Elo 调整']
  },
  {
    id: 'xiangqi',
    name: '象棋',
    tagline: '红黑对弈融合沉浸光影，禁手规则实时提示',
    theme: 'imperial',
    minPlayers: 2,
    maxPlayers: 2,
    recommendedOrientation: 'landscape',
    cover: assetUrls.coverXiangqi,
    board: assetUrls.boardXiangqi,
    features: ['禁着点实时提醒', '将军演出使用立体光', '内置残局教学'],
    actions: ['落子', '悔棋', '求和', '投降'],
    tutorial: ['基础走子与吃子', '识别常见杀法', '残局演练与禁手'],
    rankingRules: ['积分赛 + 段位赛并存', '超时判负带补时', '观战延时与棋谱保护']
  },
  {
    id: 'go',
    name: '围棋',
    tagline: '墨色泼洒的禅意棋院，数子点目皆有特效辅助',
    theme: 'zen',
    minPlayers: 2,
    maxPlayers: 2,
    recommendedOrientation: 'landscape',
    cover: assetUrls.coverGo,
    board: assetUrls.boardGo,
    features: ['自动数子与禁入点提示', '落子粒子轨迹', '复盘书签定位关键手'],
    actions: ['落子', '提子', '点目', '投子认输'],
    tutorial: ['自由棋到正规规则过渡', '死活题每日推送', '劫争判定与冷却机制'],
    rankingRules: ['段位以九段为顶', '弃权扣分 + 复盘限制', '好友榜采用让子平衡']
  }
];
