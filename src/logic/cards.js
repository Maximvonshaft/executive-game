const SUITS = [
  { key: 'spade', icon: '♠', color: '#202020' },
  { key: 'heart', icon: '♥', color: '#d83b54' },
  { key: 'club', icon: '♣', color: '#202020' },
  { key: 'diamond', icon: '♦', color: '#d83b54' }
];

export const RANK_ORDER = [
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: 'J', value: 11 },
  { label: 'Q', value: 12 },
  { label: 'K', value: 13 },
  { label: 'A', value: 14 },
  { label: '2', value: 15 }
];

const VALUE_MAP = Object.fromEntries(
  RANK_ORDER.map((item) => [item.label, item.value])
);

VALUE_MAP['SJ'] = 16;
VALUE_MAP['BJ'] = 17;

export function createDeck() {
  const deck = [];
  let idCounter = 0;
  for (const rank of RANK_ORDER) {
    for (const suit of SUITS) {
      deck.push(createCard(rank.label, rank.value, suit, idCounter++));
    }
  }

  deck.push(createJoker('SJ', '小王', '#f6c667', idCounter++));
  deck.push(createJoker('BJ', '大王', '#f69c67', idCounter++));

  return deck;
}

function createCard(rankLabel, value, suit, id) {
  const display = `${rankLabel}${suit.icon}`;
  return {
    id: `${rankLabel}-${suit.key}-${id}`,
    rank: rankLabel,
    value,
    suit: suit.icon,
    color: suit.color,
    label: display,
    isJoker: false
  };
}

function createJoker(code, label, color, id) {
  return {
    id: `${code}-${id}`,
    rank: code,
    value: VALUE_MAP[code],
    suit: '',
    color,
    label,
    isJoker: true
  };
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function deal(deck) {
  const players = [[], [], []];
  const landlordCards = [];
  deck.forEach((card, index) => {
    if (index < 51) {
      players[index % 3].push(card);
    } else {
      landlordCards.push(card);
    }
  });
  players.forEach(sortHand);
  return { players, landlordCards };
}

export function sortHand(hand) {
  hand.sort((a, b) => {
    if (a.value === b.value) {
      return a.id.localeCompare(b.id);
    }
    return b.value - a.value;
  });
  return hand;
}

export function describeCard(card) {
  return card.isJoker ? card.label : `${card.rank}${card.suit}`;
}

export function evaluateLandlord(hands) {
  const scores = hands.map(scoreHand);
  let bestIndex = 0;
  scores.forEach((score, index) => {
    if (score > scores[bestIndex]) {
      bestIndex = index;
    }
  });
  return bestIndex;
}

function scoreHand(hand) {
  const counts = countByValue(hand);
  let score = 0;
  for (const card of hand) {
    score += card.value;
    if (card.value >= 15) {
      score += 8;
    }
  }

  counts.forEach((count, value) => {
    if (count >= 2) score += 6;
    if (count >= 3) score += 12;
    if (count === 4) score += 24;
  });
  return score;
}

export function removeCardsFromHand(hand, cardsToRemove) {
  const ids = new Set(cardsToRemove.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

function countByValue(cards) {
  const map = new Map();
  cards.forEach((card) => {
    map.set(card.value, (map.get(card.value) || 0) + 1);
  });
  return map;
}

export function evaluateCombination(cards) {
  if (!cards || cards.length === 0) {
    return null;
  }
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const counts = countByValue(cards);
  const uniqueValues = [...counts.keys()].sort((a, b) => a - b);
  const len = cards.length;

  // Rocket
  if (len === 2 && counts.get(16) === 1 && counts.get(17) === 1) {
    return createCombo('rocket', 17, len, cards);
  }

  // Bomb
  if (len === 4 && counts.size === 1 && counts.values().next().value === 4) {
    return createCombo('bomb', sorted[0].value, len, cards);
  }

  if (len === 1) {
    return createCombo('single', sorted[0].value, len, cards);
  }

  if (len === 2 && counts.size === 1) {
    return createCombo('pair', sorted[0].value, len, cards);
  }

  if (len === 3 && counts.size === 1) {
    return createCombo('triple', sorted[0].value, len, cards);
  }

  if (len === 4 && counts.size === 2) {
    const [[valueA, countA], [valueB, countB]] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    if (countA === 3) {
      return createCombo('tripleSingle', Number(valueA), len, cards);
    }
  }

  if (len === 5) {
    if (isStraight(uniqueValues, counts, len)) {
      return createCombo('straight', sorted[sorted.length - 1].value, len, cards);
    }
    const [[valueA, countA], [valueB, countB]] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    if (countA === 3 && countB === 2) {
      return createCombo('triplePair', Number(valueA), len, cards);
    }
  }

  if (len >= 5 && isStraight(uniqueValues, counts, len)) {
    return createCombo('straight', sorted[sorted.length - 1].value, len, cards);
  }

  if (len % 2 === 0 && len >= 6 && isStraightPairs(uniqueValues, counts, len)) {
    return createCombo(
      'straightPairs',
      Math.max(...uniqueValues),
      len,
      cards
    );
  }

  if (len % 3 === 0 && len >= 6 && isPlane(uniqueValues, counts, len)) {
    return createCombo('plane', Math.max(...uniqueValues), len, cards);
  }

  return null;
}

function isStraight(values, counts, length) {
  if (values.length !== length) return false;
  if (values.some((value) => value >= VALUE_MAP['2'])) return false;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] + 1) {
      return false;
    }
  }
  if ([...counts.values()].some((count) => count !== 1)) {
    return false;
  }
  return true;
}

function isStraightPairs(values, counts, length) {
  if (values.length * 2 !== length) return false;
  if (values.some((value) => value >= VALUE_MAP['2'])) return false;
  for (const value of values) {
    if (counts.get(value) !== 2) {
      return false;
    }
  }
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

function isPlane(values, counts, length) {
  if (values.length * 3 !== length) return false;
  if (values.some((value) => value >= VALUE_MAP['2'])) return false;
  for (const value of values) {
    if (counts.get(value) !== 3) {
      return false;
    }
  }
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

function createCombo(type, rank, length, cards) {
  return {
    type,
    rank,
    length,
    cards: [...cards]
  };
}

export function canBeat(candidate, target) {
  if (!candidate) return false;
  if (!target) return true;
  if (candidate.type === 'rocket') return true;
  if (target.type === 'rocket') return false;
  if (candidate.type === 'bomb' && target.type !== 'bomb') return true;
  if (candidate.type !== target.type) {
    return false;
  }
  if (candidate.length !== target.length) {
    return false;
  }
  if (candidate.type === 'straight' || candidate.type === 'straightPairs' || candidate.type === 'plane') {
    return candidate.rank > target.rank;
  }
  return candidate.rank > target.rank;
}

export function generateAllCombos(hand) {
  const combos = [];
  const grouped = groupByValue(hand);
  const values = [...grouped.keys()].sort((a, b) => a - b);

  // Singles
  hand.forEach((card) => {
    combos.push(createCombo('single', card.value, 1, [card]));
  });

  // Pairs
  values.forEach((value) => {
    const cards = grouped.get(value);
    if (cards.length >= 2) {
      combos.push(createCombo('pair', value, 2, cards.slice(0, 2)));
    }
  });

  // Triples
  values.forEach((value) => {
    const cards = grouped.get(value);
    if (cards.length >= 3) {
      const triple = cards.slice(0, 3);
      combos.push(createCombo('triple', value, 3, triple));

      // Triple + single
      hand
        .filter((card) => card.value !== value)
        .forEach((single) => {
          combos.push(
            createCombo('tripleSingle', value, 4, [...triple, single])
          );
        });

      // Triple + pair
      values.forEach((attachValue) => {
        if (attachValue === value) return;
        const attachCards = grouped.get(attachValue);
        if (attachCards.length >= 2) {
          combos.push(
            createCombo('triplePair', value, 5, [
              ...triple,
              ...attachCards.slice(0, 2)
            ])
          );
        }
      });
    }
  });

  // Bombs
  values.forEach((value) => {
    const cards = grouped.get(value);
    if (cards.length === 4) {
      combos.push(createCombo('bomb', value, 4, cards.slice(0, 4)));
    }
  });

  // Rocket
  const jokerSmall = hand.find((card) => card.rank === 'SJ');
  const jokerBig = hand.find((card) => card.rank === 'BJ');
  if (jokerSmall && jokerBig) {
    combos.push(createCombo('rocket', 17, 2, [jokerSmall, jokerBig]));
  }

  // Straights
  combos.push(...generateStraights(grouped));
  combos.push(...generateStraightPairs(grouped));
  combos.push(...generatePlanes(grouped));

  // Remove duplicates by signature (since attachments may duplicate order)
  const seen = new Set();
  return combos.filter((combo) => {
    const signature = combo.cards
      .map((card) => card.id)
      .sort()
      .join('|');
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function groupByValue(hand) {
  const grouped = new Map();
  hand.forEach((card) => {
    if (!grouped.has(card.value)) {
      grouped.set(card.value, []);
    }
    grouped.get(card.value).push(card);
  });
  grouped.forEach((cards) => cards.sort((a, b) => a.id.localeCompare(b.id)));
  return grouped;
}

function generateStraights(grouped) {
  const combos = [];
  const candidateValues = [...grouped.keys()]
    .filter((value) => value < VALUE_MAP['2'])
    .sort((a, b) => a - b);

  for (let i = 0; i < candidateValues.length; i += 1) {
    let sequence = [candidateValues[i]];
    for (let j = i + 1; j < candidateValues.length; j += 1) {
      if (candidateValues[j] === candidateValues[j - 1] + 1) {
        sequence.push(candidateValues[j]);
        if (sequence.length >= 5) {
          combos.push(
            createCombo(
              'straight',
              Math.max(...sequence),
              sequence.length,
              sequence.map((value) => grouped.get(value)[0])
            )
          );
        }
      } else {
        break;
      }
    }
  }
  return combos;
}

function generateStraightPairs(grouped) {
  const combos = [];
  const candidateValues = [...grouped.keys()]
    .filter((value) => value < VALUE_MAP['2'] && grouped.get(value).length >= 2)
    .sort((a, b) => a - b);

  for (let i = 0; i < candidateValues.length; i += 1) {
    let sequence = [candidateValues[i]];
    for (let j = i + 1; j < candidateValues.length; j += 1) {
      if (candidateValues[j] === candidateValues[j - 1] + 1) {
        sequence.push(candidateValues[j]);
        if (sequence.length >= 3) {
          combos.push(
            createCombo(
              'straightPairs',
              Math.max(...sequence),
              sequence.length * 2,
              sequence
                .map((value) => grouped.get(value).slice(0, 2))
                .flat()
            )
          );
        }
      } else {
        break;
      }
    }
  }
  return combos;
}

function generatePlanes(grouped) {
  const combos = [];
  const candidateValues = [...grouped.keys()]
    .filter((value) => value < VALUE_MAP['2'] && grouped.get(value).length >= 3)
    .sort((a, b) => a - b);

  for (let i = 0; i < candidateValues.length; i += 1) {
    let sequence = [candidateValues[i]];
    for (let j = i + 1; j < candidateValues.length; j += 1) {
      if (candidateValues[j] === candidateValues[j - 1] + 1) {
        sequence.push(candidateValues[j]);
        if (sequence.length >= 2) {
          combos.push(
            createCombo(
              'plane',
              Math.max(...sequence),
              sequence.length * 3,
              sequence
                .map((value) => grouped.get(value).slice(0, 3))
                .flat()
            )
          );
        }
      } else {
        break;
      }
    }
  }
  return combos;
}

export function findPlayableCombos(hand, lastCombo) {
  const combos = generateAllCombos(hand).sort(
    (a, b) => a.cards.length - b.cards.length || a.rank - b.rank
  );
  if (!lastCombo) {
    return combos;
  }
  return combos.filter((combo) => canBeat(combo, lastCombo));
}

export function formatCombo(combo) {
  if (!combo) return 'PASS';
  const typeLabels = {
    single: '单牌',
    pair: '对子',
    triple: '三张',
    tripleSingle: '三带一',
    triplePair: '三带二',
    straight: '顺子',
    straightPairs: '连对',
    plane: '飞机',
    bomb: '炸弹',
    rocket: '火箭'
  };
  const cards = combo.cards.map(describeCard).join(' ');
  return `${typeLabels[combo.type] || combo.type}：${cards}`;
}
