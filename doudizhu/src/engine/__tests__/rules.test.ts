import { describe, expect, it } from 'vitest';
import { parseCombo, canBeat, RANK_ORDER } from '../rules';
import type { Card } from '../../types';

function card(rank: string, idSuffix = ''): Card {
  return { id: `${rank}${idSuffix}`, rank: rank as any, suit: 'S' };
}

describe('parseCombo 基础牌型', () => {
  it('顺子合法性', () => {
    const straight = parseCombo(['10', 'J', 'Q', 'K', 'A'].map((r, idx) => card(r, String(idx))));
    expect(straight?.type).toBe('STRAIGHT');
    const invalid = parseCombo(['2', 'A', 'K', 'Q', 'J'].map((r, idx) => card(r, String(idx))));
    expect(invalid).toBeNull();
    const invalidJoker = parseCombo(['SJ', 'Q', 'K', 'A', '10'].map((r, idx) => card(r, String(idx))));
    expect(invalidJoker).toBeNull();
  });

  it('连对合法性', () => {
    const ok = parseCombo(['3', '3', '4', '4', '5', '5'].map((r, idx) => card(r, String(idx))));
    expect(ok?.type).toBe('PAIR_SEQUENCE');
    const ok2 = parseCombo(['4', '4', '5', '5', '6', '6', '7', '7', '8', '8'].map((r, idx) => card(r, String(idx))));
    expect(ok2?.type).toBe('PAIR_SEQUENCE');
    const bad = parseCombo(['5', '5', '6', '6', '7', '7', '2', '2'].map((r, idx) => card(r, String(idx))));
    expect(bad).toBeNull();
  });

  it('飞机判断', () => {
    const plane = parseCombo([
      card('3', 'a'),
      card('3', 'b'),
      card('3', 'c'),
      card('4', 'a'),
      card('4', 'b'),
      card('4', 'c')
    ]);
    expect(plane?.type).toBe('TRIPLE_SEQUENCE');
    const withSingles = parseCombo([
      card('3', 'a'),
      card('3', 'b'),
      card('3', 'c'),
      card('4', 'a'),
      card('4', 'b'),
      card('4', 'c'),
      card('7', 'x'),
      card('8', 'x')
    ]);
    expect(withSingles?.type).toBe('TRIPLE_SEQ_W_SINGLES');
    const withPairs = parseCombo([
      card('3', 'a'),
      card('3', 'b'),
      card('3', 'c'),
      card('4', 'a'),
      card('4', 'b'),
      card('4', 'c'),
      card('5', 'a'),
      card('5', 'b'),
      card('6', 'a'),
      card('6', 'b')
    ]);
    expect(withPairs?.type).toBe('TRIPLE_SEQ_W_PAIRS');
    const invalid = parseCombo([
      card('3', 'a'),
      card('3', 'b'),
      card('3', 'c'),
      card('5', 'a'),
      card('5', 'b'),
      card('5', 'c'),
      card('7', 'a'),
      card('7', 'b'),
      card('7', 'c'),
      card('7', 'd')
    ]);
    expect(invalid).toBeNull();
  });

  it('四带判断', () => {
    const ok = parseCombo([
      card('6', 'a'),
      card('6', 'b'),
      card('6', 'c'),
      card('6', 'd'),
      card('7', 'a'),
      card('8', 'a')
    ]);
    expect(ok?.type).toBe('FOUR_WITH_2');
    const ok2 = parseCombo([
      card('6', 'a'),
      card('6', 'b'),
      card('6', 'c'),
      card('6', 'd'),
      card('5', 'a'),
      card('5', 'b'),
      card('7', 'a'),
      card('7', 'b')
    ]);
    expect(ok2?.type).toBe('FOUR_WITH_PAIRS');
    const invalid = parseCombo([
      card('6', 'a'),
      card('6', 'b'),
      card('6', 'c'),
      card('6', 'd'),
      card('5', 'a'),
      card('5', 'b'),
      card('5', 'c'),
      card('5', 'd')
    ]);
    expect(invalid).toBeNull();
  });
});

describe('canBeat 比较规则', () => {
  it('炸弹与火箭优先级', () => {
    const bomb = parseCombo([card('6', '1'), card('6', '2'), card('6', '3'), card('6', '4')])!;
    const triple = parseCombo([card('7', '1'), card('7', '2'), card('7', '3')])!;
    expect(canBeat(bomb, triple)).toBe(true);
    const rocket = parseCombo([card('SJ'), card('BJ')])!;
    expect(canBeat(rocket, bomb)).toBe(true);
  });

  it('结构一致才可压', () => {
    const straight = parseCombo(['7', '8', '9', '10', 'J'].map((r, idx) => card(r, String(idx))))!;
    const longer = parseCombo(['8', '9', '10', 'J', 'Q', 'K'].map((r, idx) => card(r, `x${idx}`)))!;
    expect(canBeat(longer, straight)).toBe(false);
  });
});
