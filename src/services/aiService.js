const { createError } = require('../errors/codes');
const {
  BOARD_SIZE,
  LINE_TARGET,
  createInitialState,
  applyMove,
  serializeBoard
} = require('../engines/gomoku');

const SUPPORTED_GAMES = new Set(['gomoku']);
const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 }
];
const ALLOWED_MODES = new Set(['practice', 'analysis', 'review']);
const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const MAX_SUGGESTIONS = 5;

const cache = new Map();
const rateLimiter = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePlayer(value) {
  if (value === 0 || value === 'black') {
    return 0;
  }
  if (value === 1 || value === 'white') {
    return 1;
  }
  return null;
}

function encodeBoard(board) {
  return board
    .map((row) => row.map((cell) => (cell === null || cell === undefined ? '.' : String(cell))).join(''))
    .join('/');
}

function makeCacheKey({ gameId, state }) {
  const boardKey = encodeBoard(state.board);
  return `${gameId}|${state.nextPlayerIndex}|${boardKey}`;
}

function coordinateLabel(x, y) {
  const column = String.fromCharCode('A'.charCodeAt(0) + x);
  return `${column}${y + 1}`;
}

function sanitizeMoves(moves, state) {
  if (moves === undefined) {
    return { state };
  }
  if (!Array.isArray(moves)) {
    throw createError('AI_POSITION_INVALID');
  }
  let nextState = state;
  moves.forEach((rawMove) => {
    if (!rawMove || typeof rawMove !== 'object') {
      throw createError('AI_POSITION_INVALID');
    }
    const x = Number(rawMove.x);
    const y = Number(rawMove.y);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      throw createError('AI_POSITION_INVALID');
    }
    let playerIndex = null;
    if (rawMove.playerIndex !== undefined || rawMove.player !== undefined) {
      playerIndex = normalizePlayer(rawMove.playerIndex !== undefined ? rawMove.playerIndex : rawMove.player);
      if (playerIndex === null) {
        throw createError('AI_POSITION_INVALID');
      }
    } else {
      playerIndex = nextState.nextPlayerIndex;
    }
    if (playerIndex !== nextState.nextPlayerIndex) {
      throw createError('AI_POSITION_INVALID');
    }
    const result = applyMove(nextState, { x, y, playerIndex });
    if (result.error) {
      throw createError('AI_POSITION_INVALID', { meta: { reason: result.error } });
    }
    nextState = result.state;
  });
  return { state: nextState };
}

function measurePattern(board, x, y, playerIndex, direction) {
  let count = 1;
  let openEnds = 0;
  let cx = x + direction.dx;
  let cy = y + direction.dy;
  while (cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE && board[cy][cx] === playerIndex) {
    count += 1;
    cx += direction.dx;
    cy += direction.dy;
  }
  if (cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE && board[cy][cx] === null) {
    openEnds += 1;
  }
  cx = x - direction.dx;
  cy = y - direction.dy;
  while (cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE && board[cy][cx] === playerIndex) {
    count += 1;
    cx -= direction.dx;
    cy -= direction.dy;
  }
  if (cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE && board[cy][cx] === null) {
    openEnds += 1;
  }
  return { length: count, openEnds };
}

function analyzePlacement(board, x, y, playerIndex) {
  const patterns = DIRECTIONS.map((direction) => measurePattern(board, x, y, playerIndex, direction));
  let best = patterns[0];
  for (let i = 1; i < patterns.length; i += 1) {
    const candidate = patterns[i];
    if (candidate.length > best.length) {
      best = candidate;
      continue;
    }
    if (candidate.length === best.length && candidate.openEnds > best.openEnds) {
      best = candidate;
    }
  }
  const forks = patterns.filter((pattern) => pattern.length >= LINE_TARGET - 1 && pattern.openEnds > 0).length;
  return {
    longestLine: best.length,
    openEnds: best.openEnds,
    forkPotential: forks >= 2,
    patterns
  };
}

function computeBestLineLength(board, playerIndex) {
  let best = 0;
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (board[y][x] !== playerIndex) {
        continue;
      }
      DIRECTIONS.forEach((direction) => {
        let count = 1;
        let cx = x + direction.dx;
        let cy = y + direction.dy;
        while (cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE && board[cy][cx] === playerIndex) {
          count += 1;
          cx += direction.dx;
          cy += direction.dy;
        }
        if (count > best) {
          best = count;
        }
      });
    }
  }
  return best;
}

function simulateImmediateWin(state, x, y, playerIndex) {
  const simulationState = {
    boardSize: state.boardSize,
    board: state.board,
    moves: state.moves,
    nextPlayerIndex: playerIndex,
    winner: null,
    winningLine: null,
    finished: false
  };
  const attempt = applyMove(simulationState, { x, y, playerIndex });
  if (attempt.error) {
    return null;
  }
  if (attempt.result && attempt.result.winner === playerIndex) {
    return attempt.result;
  }
  return null;
}

function detectOpponentThreats(state, opponentIndex) {
  const threats = new Map();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (state.board[y][x] !== null) {
        continue;
      }
      const result = simulateImmediateWin(state, x, y, opponentIndex);
      if (result) {
        const key = `${x}:${y}`;
        threats.set(key, {
          position: { x, y },
          coordinate: coordinateLabel(x, y),
          winningLine: result.winningLine
        });
      }
    }
  }
  return threats;
}

function buildExplanation({ coordinate, categories, metrics }) {
  const fragments = [];
  if (categories.includes('win_now')) {
    fragments.push(`落子 ${coordinate} 可立即连成五子，直接取胜。`);
  }
  if (categories.includes('block_immediate')) {
    fragments.push('该位置封堵了对手的必胜点，避免被立即击败。');
  }
  if (categories.includes('create_four') && !categories.includes('win_now')) {
    fragments.push('形成冲四压力，迫使对手被动应对。');
  }
  if (categories.includes('build_fork')) {
    fragments.push('同时制造双重威胁，为后续取胜创造空间。');
  }
  if (categories.includes('extend_line') && !categories.includes('win_now')) {
    fragments.push(`可以将当前连子延伸至 ${metrics.longestLine} 子，稳步推进优势。`);
  }
  if (fragments.length === 0) {
    fragments.push('该落点稳固形势，为后续进攻预留空间。');
  }
  return fragments.join(' ');
}

function evaluateCandidate({ state, x, y, playerIndex, threats, centerBias }) {
  const key = `${x}:${y}`;
  const metrics = analyzePlacement(state.board, x, y, playerIndex);
  const categories = [];
  const immediateWin = simulateImmediateWin(state, x, y, playerIndex);
  if (immediateWin) {
    categories.push('win_now');
  }
  const threat = threats.get(key);
  if (threat) {
    categories.push('block_immediate');
  }
  if (metrics.longestLine >= LINE_TARGET - 1 && metrics.openEnds > 0 && !categories.includes('win_now')) {
    categories.push('create_four');
  }
  if (metrics.forkPotential && !categories.includes('win_now')) {
    categories.push('build_fork');
  }
  if (!categories.includes('win_now') && !categories.includes('create_four') && metrics.longestLine >= 3) {
    categories.push('extend_line');
  }
  if (categories.length === 0) {
    categories.push('stabilize');
  }

  const distanceFromCenter = Math.hypot(centerBias.x - x, centerBias.y - y);
  let score = metrics.longestLine * 120 + metrics.openEnds * 25 - distanceFromCenter * 5;
  if (categories.includes('win_now')) {
    score += 10_000;
  }
  if (categories.includes('block_immediate')) {
    score += 6_000;
  }
  if (categories.includes('build_fork')) {
    score += 800;
  }
  if (categories.includes('create_four')) {
    score += 400;
  }
  if (categories.includes('extend_line')) {
    score += 200;
  }
  let preview = null;
  if (immediateWin && immediateWin.winningLine) {
    preview = { type: 'win_path', winningLine: immediateWin.winningLine };
  } else if (threat) {
    preview = {
      type: 'block',
      threat: {
        coordinate: threat.coordinate,
        position: threat.position,
        winningLine: threat.winningLine
      }
    };
  }
  return {
    position: { x, y },
    coordinate: coordinateLabel(x, y),
    score,
    categories,
    metrics,
    preview,
    explanation: buildExplanation({ coordinate: coordinateLabel(x, y), categories, metrics })
  };
}

function summarizeEvaluation(state, nextPlayerIndex, threats) {
  const opponentIndex = (nextPlayerIndex + 1) % 2;
  const selfLongest = computeBestLineLength(state.board, nextPlayerIndex);
  const opponentLongest = computeBestLineLength(state.board, opponentIndex);
  const delta = selfLongest - opponentLongest;
  let stance = 'balanced';
  if (delta >= 2) {
    stance = 'advantage';
  } else if (delta <= -2) {
    stance = 'danger';
  }
  let summary;
  if (stance === 'advantage') {
    summary = '当前执子方占据主动，可尝试继续扩大火力覆盖。';
  } else if (stance === 'danger') {
    summary = '对手威胁更大，优先考虑防守与封堵关键点。';
  } else {
    summary = '双方局势尚算均衡，围绕核心要点进行布局。';
  }
  if (threats.size > 0) {
    const coords = Array.from(threats.values())
      .map((entry) => entry.coordinate)
      .sort()
      .join('、');
    summary += ` 当前对手的直接威胁点：${coords}。`;
  }
  return {
    stance,
    longestLine: {
      self: selfLongest,
      opponent: opponentLongest
    },
    opponentThreats: Array.from(threats.values()).map((entry) => ({
      position: entry.position,
      coordinate: entry.coordinate
    })),
    summary
  };
}

function checkRateLimit(playerId, now = Date.now()) {
  if (!playerId) {
    return;
  }
  const entries = rateLimiter.get(playerId) || [];
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = entries.filter((timestamp) => timestamp > windowStart);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - recent[0]));
    rateLimiter.set(playerId, recent);
    throw createError('AI_RATE_LIMITED', { meta: { retryAfterMs } });
  }
  recent.push(now);
  rateLimiter.set(playerId, recent);
}

function buildBaseState(moves) {
  const initial = createInitialState();
  return sanitizeMoves(moves, initial);
}

function getSuggestions({ playerId, gameId, moves, nextPlayer, limit = 3, mode = 'practice', now = Date.now() }) {
  if (!SUPPORTED_GAMES.has(gameId)) {
    throw createError('AI_GAME_UNSUPPORTED');
  }
  checkRateLimit(playerId, now);
  const normalizedMode = typeof mode === 'string' && ALLOWED_MODES.has(mode) ? mode : 'practice';
  const sanitized = buildBaseState(moves);
  const state = sanitized.state;
  if (state.finished) {
    const outcome = state.winner === null ? 'draw' : state.winner === 0 ? 'black' : 'white';
    const suggestion = {
      gameId,
      mode: normalizedMode,
      generatedAt: now,
      cached: false,
      nextPlayer: state.nextPlayerIndex === 0 ? 'black' : 'white',
      position: {
        board: serializeBoard(state.board),
        moves: state.moves.map((move) => ({
          x: move.x,
          y: move.y,
          player: move.playerIndex === 0 ? 'black' : 'white'
        }))
      },
      evaluation: {
        stance: 'finished',
        longestLine: {
          self: computeBestLineLength(state.board, state.nextPlayerIndex),
          opponent: computeBestLineLength(state.board, (state.nextPlayerIndex + 1) % 2)
        },
        opponentThreats: [],
        summary: outcome === 'draw' ? '当前棋局已结束，结果为平局。' : `当前棋局已结束，${outcome === 'black' ? '黑方' : '白方'} 获胜。`
      },
      recommendedMoves: []
    };
    const cacheKey = makeCacheKey({ gameId, state });
    cache.set(cacheKey, clone(suggestion));
    return suggestion;
  }
  if (nextPlayer) {
    const expected = normalizePlayer(nextPlayer);
    if (expected === null || expected !== state.nextPlayerIndex) {
      throw createError('AI_POSITION_INVALID');
    }
  }
  const cappedLimit = Math.max(1, Math.min(MAX_SUGGESTIONS, Number.isFinite(limit) ? Math.floor(limit) : 3));
  const cacheKey = makeCacheKey({ gameId, state });
  if (cache.has(cacheKey)) {
    const cached = clone(cache.get(cacheKey));
    cached.recommendedMoves = cached.recommendedMoves.slice(0, cappedLimit);
    cached.cached = true;
    return cached;
  }
  const opponentIndex = (state.nextPlayerIndex + 1) % 2;
  const threats = detectOpponentThreats(state, opponentIndex);
  const center = { x: (BOARD_SIZE - 1) / 2, y: (BOARD_SIZE - 1) / 2 };
  const candidates = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (state.board[y][x] !== null) {
        continue;
      }
      const candidate = evaluateCandidate({ state, x, y, playerIndex: state.nextPlayerIndex, threats, centerBias: center });
      candidates.push(candidate);
    }
  }
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.coordinate.localeCompare(b.coordinate);
  });
  const topMoves = candidates.slice(0, MAX_SUGGESTIONS);
  const baseSuggestion = {
    gameId,
    mode: normalizedMode,
    generatedAt: now,
    cached: false,
    nextPlayer: state.nextPlayerIndex === 0 ? 'black' : 'white',
    position: {
      board: serializeBoard(state.board),
      moves: state.moves.map((move) => ({
        x: move.x,
        y: move.y,
        player: move.playerIndex === 0 ? 'black' : 'white'
      }))
    },
    evaluation: summarizeEvaluation(state, state.nextPlayerIndex, threats),
    recommendedMoves: topMoves
  };
  cache.set(cacheKey, clone(baseSuggestion));
  return {
    ...baseSuggestion,
    recommendedMoves: topMoves.slice(0, cappedLimit)
  };
}

function reset() {
  cache.clear();
  rateLimiter.clear();
}

module.exports = {
  getSuggestions,
  reset
};
