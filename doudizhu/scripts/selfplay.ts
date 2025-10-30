import { initGame, startDeal, startBidding, doBid, requestTurn, play, pass } from '../src/engine/state';
import type { Card } from '../src/types';
import * as easy from '../src/ai/easy';
import * as mid from '../src/ai/mid';
import * as hard from '../src/ai/hard';

const aiMap = { P0: hard, P1: mid, P2: easy } as const;

function evaluateBid(hand: Card[]): 0 | 1 | 2 | 3 {
  let score = 0;
  const high = hand.filter((c) => ['2', 'SJ', 'BJ', 'A', 'K'].includes(c.rank)).length;
  const count = new Map<string, number>();
  for (const card of hand) {
    count.set(card.rank, (count.get(card.rank) ?? 0) + 1);
  }
  const bombs = [...count.values()].filter((v) => v === 4).length;
  if (high >= 5) score = 1;
  if (bombs > 0 || high >= 7) score = 2;
  if (bombs >= 2 || high >= 9) score = 3;
  return score as 0 | 1 | 2 | 3;
}

async function run(rounds = 1000) {
  let landlordWins = 0;
  for (let i = 0; i < rounds; i++) {
    let state = startBidding(startDeal(initGame(), { seed: Date.now() + i }), 'P0');
    while (state.phase === 'BIDDING') {
      const pid = state.bidTurn!;
      state = doBid(state, pid, evaluateBid(state.hands[pid]));
    }
    let guard = 0;
    while (state.phase === 'PLAYING') {
      guard++;
      if (guard > 200) {
        throw new Error('超过最大步数');
      }
      const pid = state.trick!.currentPlayer;
      const info = requestTurn(state, pid);
      const decision = aiMap[pid].decide({
        me: pid,
        myHand: state.hands[pid],
        public: {
          trickCombo: state.trick?.combo ?? null,
          lastComboOwner: state.trick?.lastComboOwner ?? null,
          passSet: state.trick?.passSet ?? [],
          remainMap: {
            P0: state.hands.P0.length,
            P1: state.hands.P1.length,
            P2: state.hands.P2.length
          },
          landlordId: state.landlord,
          multiple: state.multiple
        },
        required: { type: info.requiredType ?? null, mustBeat: info.mustBeat }
      });
      state = decision.action === 'PASS' ? pass(state, pid) : play(state, pid, decision.cards);
    }
    if (state.winner === 'LANDLORD') landlordWins++;
  }
  console.log(`完成 ${rounds} 局，地主胜率 ${(landlordWins / rounds * 100).toFixed(1)}%`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
