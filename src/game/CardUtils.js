const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = ['♠', '♥', '♣', '♦'];
const JOKERS = [
  { label: '小王', value: 16 },
  { label: '大王', value: 17 },
];

const VALUE_MAP = new Map(
  [...RANKS.entries()].map(([index, rank]) => [rank, index + 3]),
);
VALUE_MAP.set('2', 15);

const TYPE_PRIORITY = {
  rocket: 11,
  bomb: 10,
  fourTwoPairs: 8,
  fourTwoSingles: 7,
  planePair: 6,
  planeSingle: 5,
  tripleStraight: 4,
  doubleStraight: 3,
  straight: 2,
  triplePair: 1.6,
  tripleSingle: 1.5,
  triple: 1.4,
  pair: 1.2,
  single: 1,
};

function createDeck() {
  const cards = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const value = VALUE_MAP.get(rank);
      cards.push({
        id: id++,
        suit,
        rank,
        label: `${rank}${suit}`,
        value,
      });
    }
  }
  for (const joker of JOKERS) {
    cards.push({
      id: id++,
      suit: 'JOKER',
      rank: joker.label,
      label: joker.label,
      value: joker.value,
    });
  }
  return cards;
}

function shuffle(array, rng = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function dealPlayers(deck) {
  const players = [[], [], []];
  const landlordCards = deck.slice(-3);
  for (let i = 0; i < deck.length - 3; i += 1) {
    players[i % 3].push(deck[i]);
  }
  return { players, landlordCards };
}

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    if (b.value !== a.value) {
      return b.value - a.value;
    }
    return a.suit.localeCompare(b.suit);
  });
}

function groupByValue(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!map.has(card.value)) {
      map.set(card.value, []);
    }
    map.get(card.value).push(card);
  }
  return map;
}

function isStraight(values) {
  if (values.length <= 1) {
    return true;
  }
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

function evaluateCombo(cards) {
  if (!cards || cards.length === 0) {
    return null;
  }
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const values = sorted.map((card) => card.value);
  const counts = groupByValue(sorted);
  const uniqueValues = [...counts.keys()].sort((a, b) => a - b);
  const countValues = [...counts.values()].map((arr) => arr.length).sort((a, b) => b - a);

  const cardCount = cards.length;

  // Rocket
  if (
    cardCount === 2 &&
    values.includes(16) &&
    values.includes(17)
  ) {
    return {
      type: 'rocket',
      typeRank: TYPE_PRIORITY.rocket,
      value: 17,
      length: 1,
    };
  }

  // Bomb
  if (countValues[0] === 4 && cardCount === 4) {
    const bombValue = uniqueValues.find((value) => counts.get(value).length === 4);
    return {
      type: 'bomb',
      typeRank: TYPE_PRIORITY.bomb,
      value: bombValue,
      length: 1,
    };
  }

  // Four with attachments
  if (countValues[0] === 4) {
    const fourValue = uniqueValues.find((value) => counts.get(value).length === 4);
    const others = uniqueValues.filter((value) => value !== fourValue);
    const otherCounts = others.map((value) => counts.get(value).length).sort();
    if (cardCount === 6 && otherCounts.every((count) => count === 1)) {
      return {
        type: 'fourTwoSingles',
        typeRank: TYPE_PRIORITY.fourTwoSingles,
        value: fourValue,
        length: 1,
      };
    }
    if (
      cardCount === 8 &&
      otherCounts.length === 2 &&
      otherCounts.every((count) => count === 2)
    ) {
      return {
        type: 'fourTwoPairs',
        typeRank: TYPE_PRIORITY.fourTwoPairs,
        value: fourValue,
        length: 1,
      };
    }
  }

  if (cardCount === 1) {
    return {
      type: 'single',
      typeRank: TYPE_PRIORITY.single,
      value: values[0],
      length: 1,
    };
  }

  if (cardCount === 2 && countValues[0] === 2) {
    return {
      type: 'pair',
      typeRank: TYPE_PRIORITY.pair,
      value: values[0],
      length: 1,
    };
  }

  if (cardCount === 3 && countValues[0] === 3) {
    return {
      type: 'triple',
      typeRank: TYPE_PRIORITY.triple,
      value: values[0],
      length: 1,
    };
  }

  if (cardCount === 4 && countValues[0] === 3 && countValues[1] === 1) {
    const tripleValue = uniqueValues.find((value) => counts.get(value).length === 3);
    return {
      type: 'tripleSingle',
      typeRank: TYPE_PRIORITY.tripleSingle,
      value: tripleValue,
      length: 1,
    };
  }

  if (cardCount === 5 && countValues[0] === 3 && countValues[1] === 2) {
    const tripleValue = uniqueValues.find((value) => counts.get(value).length === 3);
    return {
      type: 'triplePair',
      typeRank: TYPE_PRIORITY.triplePair,
      value: tripleValue,
      length: 1,
    };
  }

  // Straight (single)
  if (
    cardCount >= 5 &&
    countValues[0] === 1 &&
    uniqueValues.length === cardCount &&
    uniqueValues[uniqueValues.length - 1] <= 14 &&
    isStraight(uniqueValues)
  ) {
    return {
      type: 'straight',
      typeRank: TYPE_PRIORITY.straight,
      value: uniqueValues[uniqueValues.length - 1],
      length: cardCount,
    };
  }

  // Double straight
  if (
    cardCount >= 6 &&
    cardCount % 2 === 0 &&
    countValues[0] === 2 &&
    uniqueValues.length === cardCount / 2 &&
    uniqueValues[uniqueValues.length - 1] <= 14 &&
    uniqueValues.every((value) => counts.get(value).length === 2) &&
    isStraight(uniqueValues)
  ) {
    return {
      type: 'doubleStraight',
      typeRank: TYPE_PRIORITY.doubleStraight,
      value: uniqueValues[uniqueValues.length - 1],
      length: uniqueValues.length,
    };
  }

  // Triple straight variants
  const tripleValues = uniqueValues.filter((value) => counts.get(value).length === 3);
  if (tripleValues.length >= 2 && tripleValues[tripleValues.length - 1] <= 14 && isStraight(tripleValues)) {
    const tripleCount = tripleValues.length;
    if (cardCount === tripleCount * 3) {
      return {
        type: 'tripleStraight',
        typeRank: TYPE_PRIORITY.tripleStraight,
        value: tripleValues[tripleValues.length - 1],
        length: tripleCount,
      };
    }
    const remainingCount = cardCount - tripleCount * 3;
    const attachments = [];
    for (const value of uniqueValues) {
      if (!tripleValues.includes(value)) {
        attachments.push(counts.get(value).length);
      }
    }
    attachments.sort((a, b) => a - b);
    if (
      remainingCount === tripleCount &&
      attachments.length === tripleCount &&
      attachments.every((count) => count === 1)
    ) {
      return {
        type: 'planeSingle',
        typeRank: TYPE_PRIORITY.planeSingle,
        value: tripleValues[tripleValues.length - 1],
        length: tripleCount,
      };
    }
    if (
      remainingCount === tripleCount * 2 &&
      attachments.length === tripleCount &&
      attachments.every((count) => count === 2)
    ) {
      return {
        type: 'planePair',
        typeRank: TYPE_PRIORITY.planePair,
        value: tripleValues[tripleValues.length - 1],
        length: tripleCount,
      };
    }
  }

  return null;
}

function canBeat(candidateCombo, baseCombo) {
  if (!candidateCombo) {
    return false;
  }
  if (!baseCombo) {
    return true;
  }
  if (candidateCombo.type === 'rocket') {
    return true;
  }
  if (baseCombo.type === 'rocket') {
    return false;
  }
  if (candidateCombo.type === 'bomb') {
    if (baseCombo.type !== 'bomb') {
      return true;
    }
    return candidateCombo.value > baseCombo.value;
  }
  if (baseCombo.type === 'bomb') {
    return false;
  }
  if (candidateCombo.type !== baseCombo.type) {
    return false;
  }
  if (candidateCombo.length !== baseCombo.length) {
    return false;
  }
  return candidateCombo.value > baseCombo.value;
}

function describeCombo(combo, cards) {
  if (!combo) {
    return '不出';
  }
  const names = {
    rocket: '火箭',
    bomb: '炸弹',
    fourTwoSingles: '四带二',
    fourTwoPairs: '四带两对',
    planePair: '飞机带双对',
    planeSingle: '飞机带单牌',
    tripleStraight: '飞机',
    doubleStraight: '连对',
    straight: '顺子',
    triplePair: '三带一对',
    tripleSingle: '三带一',
    triple: '三张',
    pair: '对牌',
    single: '单牌',
  };
  const label = cards.map((card) => card.label).join(' ');
  return `${names[combo.type] ?? combo.type}：${label}`;
}

function pickCards(hand, requirements) {
  const used = new Set();
  const selected = [];
  for (const requirement of requirements) {
    const { value, count } = requirement;
    const available = [];
    hand.forEach((card, index) => {
      if (card.value === value && !used.has(index)) {
        available.push({ card, index });
      }
    });
    if (available.length < count) {
      return null;
    }
    for (let i = 0; i < count; i += 1) {
      const { card, index } = available[i];
      used.add(index);
      selected.push(card);
    }
  }
  return selected;
}

function getSingles(hand) {
  return hand.map((card) => {
    const combo = evaluateCombo([card]);
    return { cards: [card], combo };
  });
}

function getPairs(hand, groups) {
  const combos = [];
  for (const [value, cards] of groups) {
    if (cards.length >= 2) {
      const selection = cards.slice(0, 2);
      combos.push({ cards: selection, combo: evaluateCombo(selection) });
    }
  }
  return combos;
}

function getTriples(hand, groups) {
  const combos = [];
  for (const [value, cards] of groups) {
    if (cards.length >= 3) {
      const selection = cards.slice(0, 3);
      combos.push({ cards: selection, combo: evaluateCombo(selection) });
    }
  }
  return combos;
}

function generateStraightCombos(groups, minLength, requireCount, type) {
  const values = [...groups.entries()]
    .filter(([value, cards]) => value <= 14 && cards.length >= requireCount)
    .map(([value]) => value)
    .sort((a, b) => a - b);

  const combos = [];
  let start = 0;
  while (start < values.length) {
    let end = start;
    while (end + 1 < values.length && values[end + 1] === values[end] + 1) {
      end += 1;
    }
    const run = values.slice(start, end + 1);
    if (run.length >= minLength) {
      for (let length = minLength; length <= run.length; length += 1) {
        for (let offset = 0; offset <= run.length - length; offset += 1) {
          const segment = run.slice(offset, offset + length);
          const requirements = segment.map((value) => ({ value, count: requireCount }));
          const cards = pickCards(
            segment
              .flatMap((value) => groups.get(value))
              .sort((a, b) => a.value - b.value),
            requirements,
          );
          if (cards) {
            const combo = evaluateCombo(cards);
            if (combo && combo.type === type) {
              combos.push({ cards, combo });
            }
          }
        }
      }
    }
    start = end + 1;
  }
  return combos;
}

function generateTripleAttachments(hand, groups) {
  const combos = [];
  const tripleGroups = [...groups.entries()].filter(([, cards]) => cards.length >= 3 && cards[0].value <= 14);
  const tripleValues = tripleGroups.map(([value]) => value).sort((a, b) => a - b);

  let start = 0;
  while (start < tripleValues.length) {
    let end = start;
    while (end + 1 < tripleValues.length && tripleValues[end + 1] === tripleValues[end] + 1) {
      end += 1;
    }
    const run = tripleValues.slice(start, end + 1);
    if (run.length >= 2) {
      for (let length = 2; length <= run.length; length += 1) {
        for (let offset = 0; offset <= run.length - length; offset += 1) {
          const segment = run.slice(offset, offset + length);
          const tripleCards = segment.flatMap((value) => groups.get(value).slice(0, 3));

          const remainingCards = hand.filter((card) => !segment.includes(card.value));
          const singles = [...remainingCards];
          if (singles.length >= length) {
            const selectedSingles = singles.slice(0, length);
            const cards = [...tripleCards, ...selectedSingles];
            const combo = evaluateCombo(cards);
            if (combo && (combo.type === 'planeSingle' || combo.type === 'tripleStraight')) {
              combos.push({ cards, combo });
            }
          }

          const pairSource = new Map();
          remainingCards.forEach((card) => {
            if (!pairSource.has(card.value)) {
              pairSource.set(card.value, []);
            }
            pairSource.get(card.value).push(card);
          });
          const pairs = [...pairSource.entries()]
            .filter(([, cards]) => cards.length >= 2)
            .map(([, cards]) => cards.slice(0, 2));
          if (pairs.length >= length) {
            const selectedPairs = pairs.slice(0, length).flat();
            const cards = [...tripleCards, ...selectedPairs];
            const combo = evaluateCombo(cards);
            if (combo && (combo.type === 'planePair' || combo.type === 'tripleStraight')) {
              combos.push({ cards, combo });
            }
          }

          const purePlaneCombo = evaluateCombo(tripleCards);
          if (purePlaneCombo && purePlaneCombo.type === 'tripleStraight') {
            combos.push({ cards: tripleCards, combo: purePlaneCombo });
          }
        }
      }
    }
    start = end + 1;
  }
  return combos;
}

function generateFourWithAttachments(hand, groups) {
  const combos = [];
  for (const [value, cards] of groups) {
    if (cards.length >= 4) {
      const base = cards.slice(0, 4);
      const remaining = hand.filter((card) => card.value !== value);
      if (remaining.length >= 2) {
        for (let i = 0; i < remaining.length; i += 1) {
          for (let j = i + 1; j < remaining.length; j += 1) {
            const comboCards = [...base, remaining[i], remaining[j]];
            const combo = evaluateCombo(comboCards);
            if (combo && combo.type === 'fourTwoSingles') {
              combos.push({ cards: comboCards, combo });
            }
          }
        }
      }
      const pairMap = new Map();
      remaining.forEach((card) => {
        if (!pairMap.has(card.value)) {
          pairMap.set(card.value, []);
        }
        pairMap.get(card.value).push(card);
      });
      const pairValues = [...pairMap.entries()].filter(([, valueCards]) => valueCards.length >= 2);
      if (pairValues.length >= 2) {
        for (let i = 0; i < pairValues.length; i += 1) {
          for (let j = i + 1; j < pairValues.length; j += 1) {
            const comboCards = [
              ...base,
              ...pairValues[i][1].slice(0, 2),
              ...pairValues[j][1].slice(0, 2),
            ];
            const combo = evaluateCombo(comboCards);
            if (combo && combo.type === 'fourTwoPairs') {
              combos.push({ cards: comboCards, combo });
            }
          }
        }
      }
    }
  }
  return combos;
}

function generateBombs(groups) {
  const combos = [];
  for (const [value, cards] of groups) {
    if (cards.length >= 4) {
      const selection = cards.slice(0, 4);
      const combo = evaluateCombo(selection);
      if (combo && combo.type === 'bomb') {
        combos.push({ cards: selection, combo });
      }
    }
  }
  return combos;
}

function generateRocket(hand) {
  const small = hand.find((card) => card.value === 16);
  const big = hand.find((card) => card.value === 17);
  if (small && big) {
    const combo = evaluateCombo([small, big]);
    return [{ cards: [small, big], combo }];
  }
  return [];
}

function generateCombos(hand) {
  const sortedHand = sortHand(hand);
  const groups = groupByValue(sortedHand);

  const combos = [
    ...getSingles(sortedHand),
    ...getPairs(sortedHand, groups),
    ...getTriples(sortedHand, groups),
    ...generateStraightCombos(groups, 5, 1, 'straight'),
    ...generateStraightCombos(groups, 3, 2, 'doubleStraight'),
    ...generateTripleAttachments(sortedHand, groups),
    ...generateFourWithAttachments(sortedHand, groups),
    ...generateBombs(groups),
    ...generateRocket(sortedHand),
  ];

  const unique = [];
  const seen = new Set();
  for (const entry of combos) {
    if (!entry.combo) {
      continue;
    }
    const key = `${entry.combo.type}-${entry.combo.length}-${entry.combo.value}-${entry.cards
      .map((card) => card.id)
      .sort((a, b) => a - b)
      .join(',')}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
    }
  }
  return unique;
}

const PLAY_PRIORITIES = {
  straight: 1,
  doubleStraight: 1.1,
  tripleStraight: 1.2,
  planeSingle: 1.3,
  planePair: 1.4,
  triplePair: 2,
  tripleSingle: 2.1,
  triple: 2.2,
  pair: 3,
  single: 4,
  fourTwoSingles: 2.5,
  fourTwoPairs: 2.6,
  bomb: 5,
  rocket: 6,
};

function findBestPlay(hand, lastCombo) {
  const combos = generateCombos(hand);
  const playable = combos.filter((entry) => canBeat(entry.combo, lastCombo));
  if (playable.length === 0) {
    return null;
  }
  if (!lastCombo) {
    playable.sort((a, b) => {
      const priorityA = PLAY_PRIORITIES[a.combo.type] ?? 10;
      const priorityB = PLAY_PRIORITIES[b.combo.type] ?? 10;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      if (a.combo.length !== b.combo.length) {
        return b.combo.length - a.combo.length;
      }
      if (a.combo.value !== b.combo.value) {
        return a.combo.value - b.combo.value;
      }
      return a.cards.length - b.cards.length;
    });
    return playable[0];
  }

  playable.sort((a, b) => {
    if (a.combo.type !== b.combo.type) {
      return (TYPE_PRIORITY[a.combo.type] ?? 0) - (TYPE_PRIORITY[b.combo.type] ?? 0);
    }
    if (a.combo.length !== b.combo.length) {
      return a.combo.length - b.combo.length;
    }
    if (a.combo.value !== b.combo.value) {
      return a.combo.value - b.combo.value;
    }
    return a.cards.length - b.cards.length;
  });

  return playable[0];
}

function removeCardsFromHand(hand, cards) {
  const ids = new Set(cards.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

export {
  createDeck,
  shuffle,
  dealPlayers,
  sortHand,
  evaluateCombo,
  canBeat,
  describeCombo,
  findBestPlay,
  removeCardsFromHand,
  generateCombos,
};
