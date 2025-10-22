import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDiscipline } from '../gameConfigs';

export interface BattlePlayer {
  id: string;
  nickname: string;
  seatId: string;
  rankBadge: string;
  latencyMs: number;
  isMuted: boolean;
  isAuto: boolean;
  stack: number;
  avatar: string;
}

export interface BattleStatusEvent {
  id: string;
  timestamp: number;
  content: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
}

export interface CountdownState {
  secondsRemaining: number;
  totalSeconds: number;
  phase: 'preflop' | 'action' | 'result' | 'intermission';
}

export interface BattleSimulationState {
  players: BattlePlayer[];
  countdown: CountdownState;
  focusPlayerId: string;
  statusFeed: BattleStatusEvent[];
  chipDelta: Record<string, number>;
  handHistory: string[];
}

const samplePlayers: Record<GameDiscipline, BattlePlayer[]> = {
  texas: [
    {
      id: 'self',
      nickname: 'Aurora-Player',
      seatId: 'p1',
      rankBadge: '量子大师 · II',
      latencyMs: 36,
      isMuted: false,
      isAuto: false,
      stack: 8450,
      avatar: 'aurora-strategist'
    },
    {
      id: 'op1',
      nickname: 'NebulaFox',
      seatId: 'p2',
      rankBadge: '量子大师 · I',
      latencyMs: 68,
      isMuted: false,
      isAuto: false,
      stack: 11240,
      avatar: 'quantum-dealer'
    },
    {
      id: 'op2',
      nickname: 'CrystalSoul',
      seatId: 'p3',
      rankBadge: '星耀 · V',
      latencyMs: 92,
      isMuted: true,
      isAuto: false,
      stack: 6400,
      avatar: 'astral-scholar'
    },
    {
      id: 'op3',
      nickname: 'FlameDealer',
      seatId: 'p4',
      rankBadge: '星耀 · III',
      latencyMs: 44,
      isMuted: false,
      isAuto: false,
      stack: 7200,
      avatar: 'ember-tactician'
    }
  ],
  doudizhu: [
    {
      id: 'self',
      nickname: '地主·霓虹',
      seatId: 'landlord',
      rankBadge: '荣耀传说',
      latencyMs: 40,
      isMuted: false,
      isAuto: false,
      stack: 3,
      avatar: 'neon-card-master'
    },
    {
      id: 'op1',
      nickname: '风暴农民',
      seatId: 'farmer-left',
      rankBadge: '星耀 · I',
      latencyMs: 88,
      isMuted: false,
      isAuto: true,
      stack: 2,
      avatar: 'aurora-strategist'
    },
    {
      id: 'op2',
      nickname: '量子助农',
      seatId: 'farmer-right',
      rankBadge: '钻石 · II',
      latencyMs: 54,
      isMuted: false,
      isAuto: false,
      stack: 2,
      avatar: 'quantum-dealer'
    }
  ],
  xiangqi: [
    {
      id: 'self',
      nickname: '赤焰驭手',
      seatId: 'red',
      rankBadge: '大师段位',
      latencyMs: 24,
      isMuted: false,
      isAuto: false,
      stack: 0,
      avatar: 'jade-general'
    },
    {
      id: 'op1',
      nickname: '玉麟守护',
      seatId: 'black',
      rankBadge: '大师段位',
      latencyMs: 48,
      isMuted: false,
      isAuto: false,
      stack: 0,
      avatar: 'astral-scholar'
    }
  ]
};

const sampleHistory: Record<GameDiscipline, string[]> = {
  texas: ['BTN: 发底牌', '你: 加注到 240', 'FlameDealer: 跟注', '公共牌: A♠ 9♦ 9♣', '你: 持续下注 360'],
  doudizhu: ['地主: 发牌完成', '风暴农民: 不叫', '量子助农: 叫地主', '地主·霓虹: 抢地主成功', '地主: 打出火箭'],
  xiangqi: ['开局: 炮二平五', '黑方: 马８进７', '红方: 兵五进一', '黑方: 炮８平５', '红方: 仕六进五']
};

const phases: CountdownState['phase'][] = ['preflop', 'action', 'result', 'intermission'];

function rotatePhase(current: CountdownState['phase']): CountdownState['phase'] {
  const index = phases.indexOf(current);
  return phases[(index + 1) % phases.length];
}

export function useBattleSimulation(discipline: GameDiscipline): BattleSimulationState {
  const [countdown, setCountdown] = useState<CountdownState>({
    secondsRemaining: 18,
    totalSeconds: 20,
    phase: 'action'
  });
  const [statusFeed, setStatusFeed] = useState<BattleStatusEvent[]>(() => [
    {
      id: `${discipline}-init`,
      timestamp: Date.now(),
      content: '断线重连成功，牌面/棋面已同步。',
      tone: 'success'
    }
  ]);
  const [chipDelta, setChipDelta] = useState<Record<string, number>>({});
  const tickRef = useRef<number | null>(null);

  const players = useMemo(() => samplePlayers[discipline], [discipline]);
  const history = useMemo(() => sampleHistory[discipline], [discipline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
    }
    tickRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev.secondsRemaining > 0) {
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        }
        const nextPhase = rotatePhase(prev.phase);
        const nextTotal = nextPhase === 'intermission' ? 10 : nextPhase === 'preflop' ? 8 : 20;
        return {
          secondsRemaining: nextTotal,
          totalSeconds: nextTotal,
          phase: nextPhase
        };
      });
    }, 1000);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
      }
    };
  }, [discipline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const statusInterval = window.setInterval(() => {
      setStatusFeed((prev) => {
        const nextEvent: BattleStatusEvent = {
          id: `${discipline}-${Date.now()}`,
          timestamp: Date.now(),
          content:
            discipline === 'texas'
              ? '量子助理建议在转牌前调整下注节奏。'
              : discipline === 'doudizhu'
              ? '智能托管：为你保留炸弹组合，等待最佳出牌时机。'
              : 'AI 评估：黑方潜在“马踏飞燕”需警惕。',
          tone: 'info'
        };
        const merged = [nextEvent, ...prev].slice(0, 6);
        return merged;
      });
      setChipDelta((prev) => {
        const next: Record<string, number> = { ...prev };
        players.forEach((player) => {
          next[player.id] = Math.round(Math.random() * 400 - 150);
        });
        return next;
      });
    }, 5200);

    return () => {
      window.clearInterval(statusInterval);
    };
  }, [discipline, players]);

  return {
    players,
    countdown,
    focusPlayerId: players[0]?.id ?? 'self',
    statusFeed,
    chipDelta,
    handHistory: history
  };
}
