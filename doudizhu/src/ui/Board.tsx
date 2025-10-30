import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '../types';
import Hand from './Hand';

interface Props {
  game: GameState;
  selected: string[];
  onSelect: Dispatch<SetStateAction<string[]>>;
  message: string | null;
  replayMode: boolean;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '70vh',
  padding: '16px',
  background: '#0f172a',
  color: 'white',
  borderRadius: '12px'
};

export default function Board({ game, selected, onSelect, message, replayMode }: Props) {
  return (
    <div style={containerStyle}>
      <Opponent name="P1" cards={game.hands.P1.length} active={game.trick?.currentPlayer === 'P1'} />
      <div style={{ textAlign: 'center' }}>
        <div>底分：{game.bidBase} 倍数：{game.multiple}</div>
        <div>地主：{game.landlord ?? '-'}</div>
        <div>当前轮：{game.trick?.combo?.type ?? '自由出牌'}</div>
        <div>PASS：{game.trick?.passSet.join(',') || '无'}</div>
        {message ? <div style={{ color: '#f87171', marginTop: 8 }}>{message}</div> : null}
        {replayMode ? <div style={{ color: '#38bdf8', marginTop: 4 }}>回放模式</div> : null}
      </div>
      <Opponent name="P2" cards={game.hands.P2.length} active={game.trick?.currentPlayer === 'P2'} />
      <Hand
        cards={game.hands.P0}
        selected={selected}
        onSelect={onSelect}
        active={game.trick?.currentPlayer === 'P0'}
      />
    </div>
  );
}

function Opponent({ name, cards, active }: { name: string; cards: number; active: boolean }) {
  return (
    <div style={{ opacity: active ? 1 : 0.6 }}>
      <div>{name}</div>
      <div>剩余：{cards}</div>
    </div>
  );
}
