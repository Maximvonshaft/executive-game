import type { Phase } from '../types';

type Props = {
  phase: Phase;
  onPlay: () => void;
  onPass: () => void;
  onHint: () => void;
  onUndo: () => void;
  onNewGame: () => void;
  onBid: (score: 0 | 1 | 2 | 3) => void;
  isPlayerTurn: boolean;
  canPass: boolean;
};

const barStyle: React.CSSProperties = {
  marginTop: '16px',
  display: 'flex',
  gap: '8px',
  justifyContent: 'center'
};

const buttonStyle: React.CSSProperties = {
  background: '#2563eb',
  color: 'white',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '6px',
  cursor: 'pointer'
};

export default function Controls({
  phase,
  onPlay,
  onPass,
  onHint,
  onUndo,
  onNewGame,
  onBid,
  isPlayerTurn,
  canPass
}: Props) {
  if (phase === 'BIDDING') {
    return (
      <div style={barStyle}>
        {[0, 1, 2, 3].map((score) => (
          <button key={score} style={buttonStyle} onClick={() => onBid(score as 0 | 1 | 2 | 3)}>
            叫{score}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div style={barStyle}>
      <button style={buttonStyle} onClick={onPlay} disabled={!isPlayerTurn}>
        出牌 (Enter)
      </button>
      <button
        style={{ ...buttonStyle, background: '#f97316' }}
        onClick={onPass}
        disabled={!isPlayerTurn || !canPass}
      >
        不要
      </button>
      <button style={{ ...buttonStyle, background: '#14b8a6' }} onClick={onHint}>
        提示 (Space)
      </button>
      <button style={{ ...buttonStyle, background: '#9333ea' }} onClick={onUndo}>
        悔步 (Backspace)
      </button>
      <button style={{ ...buttonStyle, background: '#64748b' }} onClick={onNewGame}>
        新局
      </button>
    </div>
  );
}
