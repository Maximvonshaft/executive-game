import type { GameState, PlayerId } from '../types';

function baseScore(gs: GameState): number {
  return gs.bidBase * gs.multiple;
}

function playersExcept(all: PlayerId[], pid?: PlayerId): PlayerId[] {
  return pid ? all.filter((p) => p !== pid) : all;
}

function hasPlayerPlayed(gs: GameState, pid: PlayerId): boolean {
  return gs.log.some((entry) => entry.startsWith(`play:${pid}:`));
}

export function applySpring(gs: GameState): number {
  let factor = 1;
  if (!gs.landlord || !gs.winner) return factor;
  const farmers = playersExcept(['P0', 'P1', 'P2'], gs.landlord);
  const farmerPlayed = farmers.some((pid) => hasPlayerPlayed(gs, pid));
  const landlordPlayed = hasPlayerPlayed(gs, gs.landlord);
  if (gs.winner === 'LANDLORD' && !farmerPlayed) {
    factor *= 2;
  }
  if (gs.winner === 'FARMERS' && !landlordPlayed) {
    factor *= 2;
  }
  return factor;
}

export function finalize(gs: GameState): {
  scores: Record<'P0' | 'P1' | 'P2', number>;
  multiple: number;
  base: 1 | 2 | 3;
} {
  if (!gs.winner || !gs.landlord) {
    throw new Error('未完成的对局无法结算');
  }
  const springFactor = applySpring(gs);
  const finalMultiple = gs.multiple * springFactor;
  const base = gs.bidBase;
  const delta = base * finalMultiple;
  const scores: Record<'P0' | 'P1' | 'P2', number> = {
    P0: 0,
    P1: 0,
    P2: 0
  };
  if (gs.winner === 'LANDLORD') {
    scores[gs.landlord] = delta * 2;
    const farmers = playersExcept(['P0', 'P1', 'P2'], gs.landlord);
    for (const pid of farmers) {
      scores[pid] = -delta;
    }
  } else {
    scores[gs.landlord] = -delta * 2;
    const farmers = playersExcept(['P0', 'P1', 'P2'], gs.landlord);
    for (const pid of farmers) {
      scores[pid] = delta;
    }
  }
  return { scores, multiple: finalMultiple, base };
}
