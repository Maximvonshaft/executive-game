import type { SafeAreaInsets } from '../device';

export type GameDiscipline = 'texas' | 'doudizhu' | 'xiangqi';

export interface SeatLayout {
  id: string;
  label: string;
  role: 'self' | 'opponent' | 'dealer' | 'spectator';
  position: {
    landscape: { x: number; y: number };
    landscapeWide: { x: number; y: number };
    portrait: { x: number; y: number };
  };
}

export interface ActionButton {
  id: string;
  label: string;
  tone: 'primary' | 'accent' | 'caution' | 'safe';
  animationTier: 'L1' | 'L2' | 'L3';
}

export interface BattleHUDConfig {
  discipline: GameDiscipline;
  title: string;
  description: string;
  boardLayout: 'table' | 'card-fan' | 'grid-board';
  seats: SeatLayout[];
  actionRail: ActionButton[];
  overlays: {
    type: 'timer' | 'status-feed' | 'hand-history' | 'chip-counter';
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    animationTier: 'L2' | 'L3';
  }[];
  tutorial: {
    focusSteps: string[];
    lottieAnimation: string;
  };
  safeAreaPadding(safeArea: SafeAreaInsets): { top: number; bottom: number; left: number; right: number };
}

export const battleHUDConfigs: BattleHUDConfig[] = [
  {
    discipline: 'texas',
    title: '德州扑克 · 量子赛桌',
    description: '支持盲注、前注、边池与 Time Bank，兼容人机托管与断线重连。',
    boardLayout: 'table',
    seats: [
      {
        id: 'p1',
        label: '你',
        role: 'self',
        position: {
          landscape: { x: 0.5, y: 0.86 },
          landscapeWide: { x: 0.5, y: 0.82 },
          portrait: { x: 0.5, y: 0.92 }
        }
      },
      {
        id: 'p2',
        label: '左侧',
        role: 'opponent',
        position: {
          landscape: { x: 0.18, y: 0.68 },
          landscapeWide: { x: 0.14, y: 0.64 },
          portrait: { x: 0.12, y: 0.58 }
        }
      },
      {
        id: 'p3',
        label: '正前',
        role: 'opponent',
        position: {
          landscape: { x: 0.5, y: 0.26 },
          landscapeWide: { x: 0.5, y: 0.22 },
          portrait: { x: 0.5, y: 0.18 }
        }
      },
      {
        id: 'p4',
        label: '右侧',
        role: 'opponent',
        position: {
          landscape: { x: 0.82, y: 0.68 },
          landscapeWide: { x: 0.86, y: 0.64 },
          portrait: { x: 0.88, y: 0.58 }
        }
      }
    ],
    actionRail: [
      { id: 'fold', label: '弃牌', tone: 'caution', animationTier: 'L2' },
      { id: 'call', label: '跟注', tone: 'safe', animationTier: 'L2' },
      { id: 'raise', label: '加注', tone: 'primary', animationTier: 'L3' },
      { id: 'all-in', label: '全下', tone: 'accent', animationTier: 'L3' }
    ],
    overlays: [
      { type: 'timer', position: 'top-left', animationTier: 'L2' },
      { type: 'chip-counter', position: 'top-right', animationTier: 'L2' },
      { type: 'status-feed', position: 'bottom-left', animationTier: 'L3' },
      { type: 'hand-history', position: 'bottom-right', animationTier: 'L3' }
    ],
    tutorial: {
      focusSteps: ['识别盲注与前注', 'Time Bank 自动补时', '边池分配演示'],
      lottieAnimation: 'quantum-texas-onboarding.json'
    },
    safeAreaPadding: (safeArea) => ({
      top: Math.max(12, safeArea.top + 8),
      bottom: Math.max(28, safeArea.bottom + 16),
      left: Math.max(18, safeArea.left + 12),
      right: Math.max(18, safeArea.right + 12)
    })
  },
  {
    discipline: 'doudizhu',
    title: '斗地主 · 极光赛季',
    description: '支持叫/抢/加倍、春天判定、托管与断线重连提示。',
    boardLayout: 'card-fan',
    seats: [
      {
        id: 'landlord',
        label: '地主位',
        role: 'self',
        position: {
          landscape: { x: 0.5, y: 0.88 },
          landscapeWide: { x: 0.5, y: 0.84 },
          portrait: { x: 0.5, y: 0.94 }
        }
      },
      {
        id: 'farmer-left',
        label: '农民A',
        role: 'opponent',
        position: {
          landscape: { x: 0.14, y: 0.54 },
          landscapeWide: { x: 0.12, y: 0.5 },
          portrait: { x: 0.14, y: 0.38 }
        }
      },
      {
        id: 'farmer-right',
        label: '农民B',
        role: 'opponent',
        position: {
          landscape: { x: 0.86, y: 0.54 },
          landscapeWide: { x: 0.88, y: 0.5 },
          portrait: { x: 0.86, y: 0.38 }
        }
      }
    ],
    actionRail: [
      { id: 'pass', label: '不叫', tone: 'safe', animationTier: 'L2' },
      { id: 'call', label: '叫地主', tone: 'primary', animationTier: 'L3' },
      { id: 'rob', label: '抢地主', tone: 'accent', animationTier: 'L3' },
      { id: 'double', label: '加倍', tone: 'accent', animationTier: 'L3' }
    ],
    overlays: [
      { type: 'timer', position: 'top-left', animationTier: 'L2' },
      { type: 'status-feed', position: 'top-right', animationTier: 'L3' },
      { type: 'hand-history', position: 'bottom-left', animationTier: 'L2' }
    ],
    tutorial: {
      focusSteps: ['叫/抢地主规则', '炸弹与火箭演出', '春天动画展示'],
      lottieAnimation: 'aurora-doudizhu-onboarding.json'
    },
    safeAreaPadding: (safeArea) => ({
      top: Math.max(16, safeArea.top + 12),
      bottom: Math.max(34, safeArea.bottom + 18),
      left: Math.max(18, safeArea.left + 10),
      right: Math.max(18, safeArea.right + 10)
    })
  },
  {
    discipline: 'xiangqi',
    title: '象棋 · 玉麟棋苑',
    description: '内置禁手与悔棋规则（友谊赛），支持棋谱回放与观战同步。',
    boardLayout: 'grid-board',
    seats: [
      {
        id: 'red',
        label: '红方',
        role: 'self',
        position: {
          landscape: { x: 0.18, y: 0.18 },
          landscapeWide: { x: 0.16, y: 0.16 },
          portrait: { x: 0.12, y: 0.12 }
        }
      },
      {
        id: 'black',
        label: '黑方',
        role: 'opponent',
        position: {
          landscape: { x: 0.82, y: 0.18 },
          landscapeWide: { x: 0.84, y: 0.16 },
          portrait: { x: 0.88, y: 0.12 }
        }
      }
    ],
    actionRail: [
      { id: 'confirm', label: '确认落子', tone: 'primary', animationTier: 'L2' },
      { id: 'hint', label: '智能提示', tone: 'safe', animationTier: 'L1' },
      { id: 'undo', label: '悔棋', tone: 'caution', animationTier: 'L1' },
      { id: 'resign', label: '认输', tone: 'caution', animationTier: 'L2' }
    ],
    overlays: [
      { type: 'timer', position: 'top-left', animationTier: 'L2' },
      { type: 'status-feed', position: 'top-right', animationTier: 'L2' },
      { type: 'hand-history', position: 'bottom-right', animationTier: 'L2' }
    ],
    tutorial: {
      focusSteps: ['九宫与河界规则', '禁着点高亮', '补时策略'],
      lottieAnimation: 'jade-xiangqi-onboarding.json'
    },
    safeAreaPadding: (safeArea) => ({
      top: Math.max(18, safeArea.top + 10),
      bottom: Math.max(24, safeArea.bottom + 12),
      left: Math.max(20, safeArea.left + 12),
      right: Math.max(20, safeArea.right + 12)
    })
  }
];

export function getHUDConfig(discipline: GameDiscipline): BattleHUDConfig {
  const config = battleHUDConfigs.find((item) => item.discipline === discipline);
  if (!config) {
    throw new Error(`未找到 ${discipline} 的 HUD 配置`);
  }
  return config;
}
