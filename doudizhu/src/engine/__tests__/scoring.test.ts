import { describe, expect, it } from 'vitest';
import { finalize } from '../scoring';
import { initGame } from '../state';

function baseGame() {
  const gs = initGame();
  gs.landlord = 'P0';
  gs.bidBase = 3;
  gs.multiple = 2;
  gs.phase = 'ENDED';
  gs.winner = 'LANDLORD';
  gs.log.push('play:P0:SINGLE');
  return gs;
}

describe('scoring', () => {
  it('普通结算', () => {
    const gs = baseGame();
    const result = finalize(gs);
    expect(result.multiple).toBe(2);
    expect(result.scores.P0).toBe(12);
    expect(result.scores.P1).toBe(-6);
  });

  it('地主春天翻倍', () => {
    const gs = baseGame();
    gs.log = ['play:P0:SINGLE'];
    const result = finalize(gs);
    expect(result.multiple).toBe(2);
  });

  it('农民春天翻倍', () => {
    const gs = baseGame();
    gs.winner = 'FARMERS';
    gs.log = [];
    const result = finalize(gs);
    expect(result.multiple).toBe(4);
  });
});
