import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  doBid,
  hint,
  initGame,
  pass as passAction,
  play as playAction,
  requestTurn,
  restoreFromSnapshot,
  startBidding,
  startDeal
} from './engine/state';
import { finalize } from './engine/scoring';
import { load, save } from './engine/storage';
import type { Card, GameState, PlayerId } from './types';
import * as easyAI from './ai/easy';
import * as midAI from './ai/mid';
import * as hardAI from './ai/hard';
import Board from './ui/Board';
import Controls from './ui/Controls';
import HUD from './ui/HUD';

const AI_MAP = {
  EASY: easyAI,
  MID: midAI,
  HARD: hardAI
};

type Difficulty = keyof typeof AI_MAP;

function init(): GameState {
  const stored = typeof window !== 'undefined' ? load() : null;
  if (stored) {
    return stored;
  }
  const base = initGame();
  const dealt = startDeal(base, {});
  return startBidding(dealt, 'P0');
}

function App() {
  const [game, setGame] = useState<GameState>(() => init());
  const [difficulty, setDifficulty] = useState<Difficulty>('MID');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [replayMode, setReplayMode] = useState(false);

  useEffect(() => {
    save(game);
  }, [game]);

  const currentPlayer = game.trick?.currentPlayer;
  const isPlayerTurn = game.phase === 'PLAYING' && currentPlayer === 'P0';

  useEffect(() => {
    setMessage(null);
  }, [game.phase, currentPlayer]);

  useEffect(() => {
    if (game.phase === 'BIDDING' && game.bidTurn && game.bidTurn !== 'P0') {
      const timer = setTimeout(() => {
        setGame((prev) => {
          try {
            return autoBid(prev, prev.bidTurn!);
          } catch (err) {
            console.error(err);
            return prev;
          }
        });
      }, 400);
      return () => clearTimeout(timer);
    }
    if (game.phase === 'PLAYING' && currentPlayer && currentPlayer !== 'P0' && !replayMode) {
      const timer = setTimeout(() => {
       setGame((prev) => {
          try {
            const ai = AI_MAP[difficulty];
            const turnInfo = requestTurn(prev, currentPlayer);
            const decision = ai.decide({
              me: currentPlayer,
              myHand: prev.hands[currentPlayer],
              public: {
                trickCombo: prev.trick?.combo ?? null,
                lastComboOwner: prev.trick?.lastComboOwner ?? null,
                passSet: prev.trick?.passSet ?? [],
                remainMap: {
                  P0: prev.hands.P0.length,
                  P1: prev.hands.P1.length,
                  P2: prev.hands.P2.length
                },
                landlordId: prev.landlord,
                multiple: prev.multiple
              },
              required: { type: turnInfo.requiredType ?? null, mustBeat: turnInfo.mustBeat }
            });
            if (decision.action === 'PASS') {
              return passAction(prev, currentPlayer);
            }
            return playAction(prev, currentPlayer, decision.cards);
          } catch (err) {
            console.error(err);
            return prev;
          }
        });
      }, difficulty === 'HARD' ? 150 : 80);
      return () => clearTimeout(timer);
    }
  }, [game, currentPlayer, difficulty, replayMode]);

  useEffect(() => {
    const handler = (evt: KeyboardEvent) => {
      if (!isPlayerTurn || replayMode) return;
      if (evt.key === 'Enter') {
        onPlay();
      } else if (evt.key === 'Backspace') {
        setSelected([]);
      } else if (evt.key === ' ') {
        evt.preventDefault();
        onHint();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlayerTurn, replayMode, selected, game]);

  const selectedCards = useMemo(() => {
    if (!game.hands.P0.length) return [];
    const map = new Map(game.hands.P0.map((c) => [c.id, c] as const));
    return selected.map((id) => map.get(id)).filter(Boolean) as Card[];
  }, [selected, game.hands.P0]);

  function onBid(score: 0 | 1 | 2 | 3) {
    try {
      setGame((prev) => doBid(prev, 'P0', score));
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  function autoBid(state: GameState, pid: PlayerId): GameState {
    const score = evaluateBid(state.hands[pid]);
    return doBid(state, pid, score);
  }

  function onPlay() {
    if (!isPlayerTurn) return;
    try {
      const cards = selectedCards;
      if (!cards.length) {
        throw new Error('请至少选择一张牌');
      }
      const next = playAction(game, 'P0', cards);
      setGame(next);
      setSelected([]);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  function onPass() {
    try {
      setGame((prev) => passAction(prev, 'P0'));
      setSelected([]);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  function onHint() {
    try {
      const options = hint(game, 'P0');
      if (!options.length) {
        setMessage('没有可用提示');
        return;
      }
      const choice = options[0];
      setSelected(choice.map((c) => c.id));
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  function onUndo() {
    setGame((prev) => {
      if (!prev.history.length) return prev;
      const snap = prev.history[prev.history.length - 1];
      const restored = restoreFromSnapshot(prev, snap);
      restored.history = prev.history.slice(0, -1);
      return restored;
    });
  }

  function onNewGame() {
    const base = initGame();
    const dealt = startDeal(base, {});
    setGame(startBidding(dealt, 'P0'));
    setSelected([]);
    setReplayMode(false);
  }

  const settlement = useMemo(() => {
    if (game.phase === 'ENDED') {
      return finalize(game);
    }
    return null;
  }, [game]);

  return (
    <div className="app">
      <HUD
        game={game}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        settlement={settlement}
        onToggleReplay={() => setReplayMode((v) => !v)}
        replayMode={replayMode}
      />
      <Board
        game={game}
        selected={selected}
        onSelect={setSelected}
        message={message}
        replayMode={replayMode}
      />
      <Controls
        phase={game.phase}
        onPlay={onPlay}
        onPass={onPass}
        onHint={onHint}
        onUndo={onUndo}
        onNewGame={onNewGame}
        onBid={onBid}
        isPlayerTurn={isPlayerTurn}
        canPass={!!game.trick?.combo && game.trick.lastComboOwner !== 'P0'}
      />
    </div>
  );
}

function evaluateBid(hand: Card[]): 0 | 1 | 2 | 3 {
  let score = 0;
  const high = hand.filter((c) => ['2', 'SJ', 'BJ', 'A', 'K'].includes(c.rank)).length;
  const bombs = new Map<string, number>();
  for (const card of hand) {
    const key = card.rank;
    bombs.set(key, (bombs.get(key) ?? 0) + 1);
  }
  const bombCount = [...bombs.values()].filter((v) => v === 4).length;
  if (bombCount > 0 || high >= 6) score = 2;
  if (bombCount >= 2 || high >= 8) score = 3;
  if (high >= 4) score = Math.max(score, 1);
  return score as 0 | 1 | 2 | 3;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
