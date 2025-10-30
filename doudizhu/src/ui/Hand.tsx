import { useState } from 'react';
import type { Card } from '../types';

type Props = {
  cards: Card[];
  selected: string[];
  onSelect: (value: string[]) => void;
  active: boolean;
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '8px',
  margin: '0 4px',
  minWidth: '40px',
  textAlign: 'center',
  background: '#1e293b',
  color: 'white',
  userSelect: 'none'
};

export default function Hand({ cards, selected, onSelect, active }: Props) {
  const [dragStart, setDragStart] = useState<number | null>(null);

  const handleDown = (index: number) => {
    setDragStart(index);
  };

  const handleEnter = (index: number) => {
    if (dragStart === null) return;
    const [start, end] = dragStart < index ? [dragStart, index] : [index, dragStart];
    const ids = cards.slice(start, end + 1).map((card) => card.id);
    const merged = Array.from(new Set([...selected, ...ids]));
    onSelect(merged);
  };

  const handleUp = (index: number) => {
    if (dragStart === null) {
      toggle(index);
      return;
    }
    const [start, end] = dragStart < index ? [dragStart, index] : [index, dragStart];
    const ids = cards.slice(start, end + 1).map((card) => card.id);
    const merged = Array.from(new Set([...selected, ...ids]));
    onSelect(merged);
    setDragStart(null);
  };

  const toggle = (index: number) => {
    const card = cards[index];
    if (!card) return;
    if (selected.includes(card.id)) {
      onSelect(selected.filter((id) => id !== card.id));
    } else {
      onSelect([...selected, card.id]);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '12px',
        borderTop: '1px solid #1f2937'
      }}
    >
      {cards.map((card, index) => {
        const isSelected = selected.includes(card.id);
        return (
          <div
            key={card.id}
            style={{
              ...cardStyle,
              borderColor: isSelected ? '#facc15' : '#334155',
              transform: isSelected ? 'translateY(-6px)' : 'none',
              cursor: active ? 'pointer' : 'not-allowed',
              opacity: active ? 1 : 0.7
            }}
            onMouseDown={() => handleDown(index)}
            onMouseEnter={() => handleEnter(index)}
            onMouseUp={() => handleUp(index)}
            onClick={() => toggle(index)}
          >
            <div>{card.rank}</div>
            <div style={{ fontSize: 12 }}>{card.suit}</div>
          </div>
        );
      })}
    </div>
  );
}
