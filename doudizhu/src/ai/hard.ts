import { enumerateCombos } from '../engine/state';
import { canBeat, rankIndex } from '../engine/rules';
import type { AiDecision, Observation } from '../types';

function evaluateCombo(ob: Observation, remaining: number, comboCards: number, mainRank: string): number {
  const opponentPressure = Math.min(...Object.entries(ob.public.remainMap)
    .filter(([pid]) => pid !== ob.me)
    .map(([, count]) => count));
  const bombBonus = comboCards >= 4 ? -2 : 0;
  return (
    remaining * 8 +
    comboCards * 2 +
    rankIndex(mainRank as any) / 50 -
    (opponentPressure <= 2 ? 5 : 0) +
    bombBonus
  );
}

export function decide(ob: Observation): AiDecision {
  const combos = enumerateCombos(ob.myHand);
  const base = ob.public.trickCombo ?? null;
  const remain = ob.myHand.length;
  let candidates = base ? combos.filter((c) => canBeat(c, base)) : combos;
  if (!candidates.length) {
    if (!ob.required.mustBeat) {
      return { action: 'PASS' };
    }
    const bombs = combos.filter((c) => c.type === 'BOMB' || c.type === 'ROCKET');
    bombs.sort((a, b) => rankIndex(a.mainRank) - rankIndex(b.mainRank));
    if (base) {
      const usableBomb = bombs.find((c) => canBeat(c, base));
      if (usableBomb) {
        return { action: 'PLAY', cards: usableBomb.cards };
      }
    }
    return { action: 'PASS' };
  }
  candidates = candidates.filter((c) => {
    if (c.type === 'BOMB' || c.type === 'ROCKET') {
      const opponents = Object.entries(ob.public.remainMap)
        .filter(([pid]) => pid !== ob.me)
        .map(([, count]) => count);
      return Math.min(...opponents) <= 3 || remain === c.cards.length;
    }
    return true;
  });
  if (!candidates.length) {
    return { action: 'PASS' };
  }
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const combo of candidates) {
    const remaining = remain - combo.cards.length;
    const score = evaluateCombo(ob, remaining, combo.cards.length, combo.mainRank);
    if (remaining === 0) {
      return { action: 'PLAY', cards: combo.cards };
    }
    if (score < bestScore) {
      bestScore = score;
      best = combo;
    }
  }
  return { action: 'PLAY', cards: best.cards };
}
