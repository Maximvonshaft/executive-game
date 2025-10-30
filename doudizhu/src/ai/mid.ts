import { enumerateCombos } from '../engine/state';
import { canBeat, rankIndex } from '../engine/rules';
import type { AiDecision, Observation } from '../types';

function comboScore(remainCount: number, comboCards: number, mainRank: string): number {
  return remainCount * 10 + comboCards + rankIndex(mainRank as any) / 100;
}

export function decide(ob: Observation): AiDecision {
  const combos = enumerateCombos(ob.myHand);
  const base = ob.public.trickCombo ?? null;
  const remainCount = ob.myHand.length;
  const candidates = (base ? combos.filter((c) => canBeat(c, base)) : combos).filter(
    (c) => !(c.type === 'BOMB' || c.type === 'ROCKET') || remainCount <= c.cards.length + 3
  );
  if (!candidates.length) {
    if (!ob.required.mustBeat) {
      return { action: 'PASS' };
    }
    const bombs = combos.filter((c) => c.type === 'BOMB' || c.type === 'ROCKET');
    bombs.sort((a, b) => rankIndex(a.mainRank) - rankIndex(b.mainRank));
    if (bombs.length && base && canBeat(bombs[0], base)) {
      return { action: 'PLAY', cards: bombs[0].cards };
    }
    return { action: 'PASS' };
  }
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const combo of candidates) {
    const score = comboScore(remainCount - combo.cards.length, combo.cards.length, combo.mainRank);
    if (score < bestScore) {
      bestScore = score;
      best = combo;
    }
  }
  return { action: 'PLAY', cards: best.cards };
}
