import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '../types';

interface Props {
  game: GameState;
  difficulty: 'EASY' | 'MID' | 'HARD';
  onDifficultyChange: Dispatch<SetStateAction<'EASY' | 'MID' | 'HARD'>>;
  settlement: { scores: Record<'P0' | 'P1' | 'P2', number>; multiple: number; base: 1 | 2 | 3 } | null;
  onToggleReplay: () => void;
  replayMode: boolean;
}

const hudStyle: React.CSSProperties = {
  marginBottom: '16px',
  background: '#1e293b',
  color: '#e2e8f0',
  padding: '12px',
  borderRadius: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

export default function HUD({ game, difficulty, onDifficultyChange, settlement, onToggleReplay, replayMode }: Props) {
  return (
    <div style={hudStyle}>
      <div>
        <div>阶段：{game.phase}</div>
        <div>
          当前玩家：
          {game.trick?.currentPlayer ?? game.bidTurn ?? '-'}
        </div>
        <div>叫分顺序：{game.bids.map((b) => `${b.pid}:${b.score}`).join(' , ') || '未开始'}</div>
      </div>
      <div>
        <label>
          难度：
          <select value={difficulty} onChange={(e) => onDifficultyChange(e.target.value as any)}>
            <option value="EASY">EASY</option>
            <option value="MID">MID</option>
            <option value="HARD">HARD</option>
          </select>
        </label>
        <button style={{ marginLeft: 12 }} onClick={onToggleReplay}>
          {replayMode ? '退出回放' : '回放模式'}
        </button>
      </div>
      <div>
        {settlement ? (
          <div>
            <div>结算：倍数 {settlement.multiple} 底分 {settlement.base}</div>
            <div>P0: {settlement.scores.P0}</div>
            <div>P1: {settlement.scores.P1}</div>
            <div>P2: {settlement.scores.P2}</div>
          </div>
        ) : (
          <div>等待结算...</div>
        )}
      </div>
    </div>
  );
}
