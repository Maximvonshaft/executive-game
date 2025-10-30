import { enumerateCombos } from '../engine/state';
import { canBeat, rankIndex } from '../engine/rules';
import type { AiDecision, Observation } from '../types';

function sortCombos<T extends { mainRank: any; cards: any[] }>(combos: T[]): T[] {
  return combos.slice().sort((a, b) => {
    const diff = rankIndex(a.mainRank) - rankIndex(b.mainRank);
    if (diff !== 0) return diff;
    return a.cards.length - b.cards.length;
  });
}

export function decide(ob: Observation): AiDecision {
  const combos = enumerateCombos(ob.myHand);
  const base = ob.public.trickCombo ?? null;
  const usable = base ? combos.filter((c) => canBeat(c, base)) : combos;
  const safe = usable.filter((c) => c.type !== 'BOMB' && c.type !== 'ROCKET');
  const pool = safe.length ? safe : usable;
  if (pool.length === 0) {
    if (ob.required.mustBeat) {
      const bombs = combos.filter((c) => c.type === 'BOMB' || c.type === 'ROCKET');
      const sortedBombs = sortCombos(bombs).filter((c) => canBeat(c, base));
      if (sortedBombs.length) {
        return { action: 'PLAY', cards: sortedBombs[0].cards };
      }
    }
    return { action: 'PASS' };
  }
  const sorted = sortCombos(pool);
  return { action: 'PLAY', cards: sorted[0].cards };
}
