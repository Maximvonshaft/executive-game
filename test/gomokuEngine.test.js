const test = require('node:test');
const assert = require('node:assert');

const { createInitialState, placeStone } = require('../src/engine/gomoku');

test('gomoku engine detects five in a row horizontally', () => {
  let state = createInitialState({ size: 15 });
  state = placeStone(state, { stone: 'black', x: 0, y: 0 });
  state = placeStone(state, { stone: 'white', x: 0, y: 1 });
  state = placeStone(state, { stone: 'black', x: 1, y: 0 });
  state = placeStone(state, { stone: 'white', x: 1, y: 1 });
  state = placeStone(state, { stone: 'black', x: 2, y: 0 });
  state = placeStone(state, { stone: 'white', x: 2, y: 1 });
  state = placeStone(state, { stone: 'black', x: 3, y: 0 });
  state = placeStone(state, { stone: 'white', x: 3, y: 1 });
  state = placeStone(state, { stone: 'black', x: 4, y: 0 });
  assert.strictEqual(state.winner, 'black');
  assert.ok(state.finished);
  assert.deepStrictEqual(state.winningLine, [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 }
  ]);
});

test('gomoku engine rejects placing twice on same cell', () => {
  let state = createInitialState({ size: 15 });
  state = placeStone(state, { stone: 'black', x: 0, y: 0 });
  assert.throws(() => {
    placeStone(state, { stone: 'white', x: 0, y: 0 });
  }, /Cell already occupied/);
});
