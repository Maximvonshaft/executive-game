const {
  createDefaultRating,
  updateRating,
  deriveTier
} = require('./rating');

const HISTORY_LIMIT = 30;

function now() {
  return Date.now();
}

const profiles = new Map();

function ensureProfile(playerId) {
  let profile = profiles.get(playerId);
  if (!profile) {
    const timestamp = now();
    const defaults = createDefaultRating();
    profile = {
      id: playerId,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActiveAt: null,
      rating: defaults.rating,
      ratingDeviation: defaults.ratingDeviation,
      volatility: defaults.volatility,
      tier: deriveTier(defaults.rating),
      ratingHigh: defaults.rating,
      stats: {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        bestWinStreak: 0
      },
      history: [],
      achievements: [],
      currencies: {
        coins: 0
      }
    };
    profiles.set(playerId, profile);
  }
  return profile;
}

function computePairScore(outcomeA, outcomeB) {
  if (outcomeA === outcomeB) {
    return 0.5;
  }
  if (outcomeA === 'win') {
    return 1;
  }
  if (outcomeA === 'loss') {
    return 0;
  }
  if (outcomeA === 'draw') {
    if (outcomeB === 'loss') {
      return 1;
    }
    if (outcomeB === 'win') {
      return 0;
    }
  }
  return 0.5;
}

function unlockAchievement(profile, achievement, timestamp) {
  if (profile.achievements.some((entry) => entry.id === achievement.id)) {
    return false;
  }
  profile.achievements.push({
    ...achievement,
    earnedAt: timestamp
  });
  return true;
}

function evaluateAchievements(profile, result, timestamp) {
  if (result === 'win' && profile.stats.wins === 1) {
    unlockAchievement(profile, {
      id: 'first_win',
      name: '初战告捷',
      description: '完成首胜，正式踏上排位之路。'
    }, timestamp);
  }
  if (profile.stats.winStreak >= 3) {
    unlockAchievement(profile, {
      id: 'streak_three',
      name: '连胜之势',
      description: '达成 3 连胜，势不可挡。'
    }, timestamp);
  }
  if (profile.stats.totalMatches >= 25) {
    unlockAchievement(profile, {
      id: 'veteran',
      name: '久战成名',
      description: '完成 25 场排位赛，经验满满。'
    }, timestamp);
  }
  if (profile.rating >= 1600) {
    unlockAchievement(profile, {
      id: 'platinum_entry',
      name: '铂金启程',
      description: '评分达到铂金段位，向大师迈进。'
    }, timestamp);
  }
}

function summarizeOpponents(room, playerId) {
  return room.players
    .filter((participant) => participant.id !== playerId)
    .map((participant) => ({
      id: participant.id,
      seat: participant.seat,
      attributes: participant.attributes || {}
    }));
}

function processMatchResult({ room, outcomes, timestamp }) {
  const participants = room.players.map((player) => {
    const profile = ensureProfile(player.id);
    return {
      player,
      profile,
      result: outcomes.get(player.id) || 'draw',
      ratingBefore: profile.rating,
      deviationBefore: profile.ratingDeviation,
      volatilityBefore: profile.volatility,
      opponents: []
    };
  });

  for (let i = 0; i < participants.length; i += 1) {
    for (let j = 0; j < participants.length; j += 1) {
      if (i === j) continue;
      const score = computePairScore(participants[i].result, participants[j].result);
      participants[i].opponents.push({
        rating: participants[j].profile.rating,
        ratingDeviation: participants[j].profile.ratingDeviation,
        score
      });
    }
  }

  participants.forEach((participant) => {
    const update = updateRating(
      {
        rating: participant.profile.rating,
        ratingDeviation: participant.profile.ratingDeviation,
        volatility: participant.profile.volatility
      },
      participant.opponents
    );
    participant.updated = update;
  });

  const changes = [];
  participants.forEach((participant) => {
    const { profile, player } = participant;
    const { rating, ratingDeviation, volatility, delta } = participant.updated;
    profile.rating = rating;
    profile.ratingDeviation = ratingDeviation;
    profile.volatility = volatility;
    profile.tier = deriveTier(rating);
    profile.ratingHigh = Math.max(profile.ratingHigh, rating);
    profile.updatedAt = timestamp;
    profile.lastActiveAt = timestamp;

    const stats = profile.stats;
    stats.totalMatches += 1;
    if (participant.result === 'win') {
      stats.wins += 1;
      stats.winStreak += 1;
      stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
    } else if (participant.result === 'loss') {
      stats.losses += 1;
      stats.winStreak = 0;
    } else {
      stats.draws += 1;
      stats.winStreak = 0;
    }

    evaluateAchievements(profile, participant.result, timestamp);

    const entry = {
      matchId: room.id,
      roomId: room.id,
      gameId: room.gameId,
      result: participant.result,
      ratingBefore: participant.ratingBefore,
      ratingAfter: rating,
      ratingDelta: delta,
      opponents: summarizeOpponents(room, player.id),
      playedAt: timestamp,
      reason: room.result?.reason || null
    };
    profile.history.unshift(entry);
    if (profile.history.length > HISTORY_LIMIT) {
      profile.history.length = HISTORY_LIMIT;
    }

    changes.push({
      playerId: player.id,
      result: participant.result,
      ratingDelta: delta,
      ratingAfter: rating,
      profile
    });
  });

  return changes;
}

function getProfileView(playerId) {
  const profile = ensureProfile(playerId);
  const stats = profile.stats;
  const total = stats.totalMatches;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 1000) / 10 : 0;
  const shareCard = {
    headline: `${profile.tier} · ${Math.round(profile.rating)}`,
    subline: total > 0 ? `胜率 ${winRate}% · ${stats.bestWinStreak} 连胜纪录` : '等待首场排位赛',
    highlight: profile.history[0]
      ? {
          gameId: profile.history[0].gameId,
          result: profile.history[0].result,
          delta: Math.round(profile.history[0].ratingDelta)
        }
      : null
  };
  return {
    playerId: profile.id,
    rating: {
      value: profile.rating,
      deviation: profile.ratingDeviation,
      volatility: profile.volatility,
      tier: profile.tier,
      best: profile.ratingHigh
    },
    stats: {
      totalMatches: total,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate,
      winStreak: stats.winStreak,
      bestWinStreak: stats.bestWinStreak
    },
    history: profile.history.slice(0, 15),
    achievements: profile.achievements.slice(),
    currencies: { ...profile.currencies },
    createdAt: profile.createdAt,
    lastActiveAt: profile.lastActiveAt,
    shareCard
  };
}

function getAllProfiles() {
  return Array.from(profiles.values());
}

function addCoins(playerId, amount) {
  const profile = ensureProfile(playerId);
  profile.currencies.coins += amount;
  return profile.currencies.coins;
}

function reset() {
  profiles.clear();
}

module.exports = {
  ensureProfile,
  processMatchResult,
  getProfileView,
  getAllProfiles,
  addCoins,
  reset
};
