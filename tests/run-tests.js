#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  createDeck,
  dealPlayers,
  evaluateCombo,
  canBeat,
  findBestPlay,
  sortHand,
} from '../src/game/CardUtils.js';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

const deck = createDeck();

function getCard(rank, suit) {
  const card = deck.find((item) => item.rank === rank && item.suit === suit);
  if (!card) {
    throw new Error(`未找到 ${rank}${suit}`);
  }
  return { ...card };
}

function getJoker(label) {
  const card = deck.find((item) => item.label === label);
  if (!card) {
    throw new Error(`未找到 ${label}`);
  }
  return { ...card };
}

test('牌堆共 54 张牌', () => {
  assert.equal(deck.length, 54);
});

test('发牌后每家 17 张，底牌 3 张', () => {
  const { players, landlordCards } = dealPlayers(deck);
  assert.deepEqual(players.map((hand) => hand.length), [17, 17, 17]);
  assert.equal(landlordCards.length, 3);
});

test('识别火箭牌型', () => {
  const combo = evaluateCombo([getJoker('小王'), getJoker('大王')]);
  assert.ok(combo);
  assert.equal(combo.type, 'rocket');
});

test('识别顺子牌型', () => {
  const cards = [
    getCard('3', '♠'),
    getCard('4', '♥'),
    getCard('5', '♣'),
    getCard('6', '♦'),
    getCard('7', '♠'),
  ];
  const combo = evaluateCombo(cards);
  assert.ok(combo);
  assert.equal(combo.type, 'straight');
  assert.equal(combo.length, 5);
});

test('炸弹可以压制非炸弹牌型', () => {
  const bomb = evaluateCombo([
    getCard('A', '♠'),
    getCard('A', '♥'),
    getCard('A', '♣'),
    getCard('A', '♦'),
  ]);
  const triple = evaluateCombo([
    getCard('K', '♠'),
    getCard('K', '♥'),
    getCard('K', '♣'),
  ]);
  assert.ok(canBeat(bomb, triple));
});

test('AI 会优先出顺子', () => {
  const hand = sortHand([
    getCard('3', '♠'),
    getCard('4', '♥'),
    getCard('5', '♣'),
    getCard('6', '♦'),
    getCard('7', '♠'),
    getCard('9', '♠'),
  ]);
  const play = findBestPlay(hand, null);
  assert.ok(play);
  assert.equal(play.combo.type, 'straight');
  assert.equal(play.combo.length, 5);
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`❌ ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`共有 ${failures} 个测试未通过`);
  process.exit(1);
}

console.log(`全部 ${tests.length} 个测试通过`);
