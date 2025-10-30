import { describe, expect, it } from 'vitest';
import { initGame, startDeal, startBidding, doBid, play, pass, hint } from '../state';
import type { Card } from '../../types';
import { parseCombo } from '../rules';

function mockHand(): Card[] {
  return [
    { id: '3S', rank: '3', suit: 'S' },
    { id: '4S', rank: '4', suit: 'S' },
    { id: '5S', rank: '5', suit: 'S' },
    { id: '6S', rank: '6', suit: 'S' },
    { id: '7S', rank: '7', suit: 'S' },
    { id: '8S', rank: '8', suit: 'S' },
    { id: '9S', rank: '9', suit: 'S' },
    { id: '10S', rank: '10', suit: 'S' },
    { id: 'JS', rank: 'J', suit: 'S' },
    { id: 'QS', rank: 'Q', suit: 'S' },
    { id: 'KS', rank: 'K', suit: 'S' },
    { id: 'AS', rank: 'A', suit: 'S' }
  ];
}

describe('state 核心循环', () => {
  it('叫分流程', () => {
    let gs = initGame();
    gs = startDeal(gs, {});
    gs = startBidding(gs, 'P0');
    gs = doBid(gs, 'P0', 1);
    gs = doBid(gs, 'P1', 0);
    gs = doBid(gs, 'P2', 0);
    expect(gs.phase).toBe('PLAYING');
    expect(gs.landlord).toBe('P0');
  });

  it('轮收口逻辑', () => {
    let gs = initGame();
    gs = startDeal(gs, {});
    gs.hands.P0 = mockHand();
    gs.hands.P1 = mockHand();
    gs.hands.P2 = mockHand();
    gs.upcomingBottom = [];
    gs.landlord = 'P0';
    gs.phase = 'PLAYING';
    gs.trick = {
      leader: 'P0',
      currentPlayer: 'P0',
      combo: null,
      lastComboOwner: null,
      passSet: []
    };
    const combo = parseCombo(gs.hands.P0.slice(0, 5))!;
    gs = play(gs, 'P0', combo.cards);
    expect(gs.trick?.currentPlayer).toBe('P1');
    gs = pass(gs, 'P1');
    gs = pass(gs, 'P2');
    expect(gs.trick?.combo).toBeNull();
    expect(gs.trick?.currentPlayer).toBe('P0');
  });

  it('领出不可 PASS', () => {
    let gs = initGame();
    gs = startDeal(gs, {});
    gs.hands.P0 = mockHand();
    gs.hands.P1 = mockHand();
    gs.hands.P2 = mockHand();
    gs.upcomingBottom = [];
    gs.landlord = 'P0';
    gs.phase = 'PLAYING';
    gs.trick = {
      leader: 'P0',
      currentPlayer: 'P0',
      combo: null,
      lastComboOwner: null,
      passSet: []
    };
    expect(() => pass(gs, 'P0')).toThrow();
  });

  it('提示系统可用', () => {
    let gs = initGame();
    gs = startDeal(gs, {});
    gs.hands.P0 = mockHand();
    gs.hands.P1 = mockHand();
    gs.hands.P2 = mockHand();
    gs.upcomingBottom = [];
    gs.landlord = 'P0';
    gs.phase = 'PLAYING';
    gs.trick = {
      leader: 'P0',
      currentPlayer: 'P0',
      combo: null,
      lastComboOwner: null,
      passSet: []
    };
    const hints = hint(gs, 'P0');
    expect(hints.length).toBeGreaterThan(0);
  });
});
