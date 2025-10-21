const BASE_RATING = 1500;
const BASE_RD = 350;
const BASE_VOLATILITY = 0.06;
const MIN_RD = 30;
const MAX_RD = 350;
const SCALE = 173.7178; // conversion between rating/RD and Glicko-2 scale
const Q = Math.log(10) / 400;
const TAU = 0.5;
const EPSILON = 1e-6;
const INACTIVITY_INCREASE = 30;

function toMu(rating) {
  return (rating - BASE_RATING) / SCALE;
}

function toPhi(rd) {
  return rd / SCALE;
}

function fromMu(mu) {
  return mu * SCALE + BASE_RATING;
}

function fromPhi(phi) {
  return phi * SCALE;
}

function g(phi) {
  return 1 / Math.sqrt(1 + (3 * Q ** 2 * phi ** 2) / Math.PI ** 2);
}

function E(mu, muJ, phiJ) {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function clampRd(rd) {
  if (Number.isNaN(rd) || !Number.isFinite(rd)) {
    return MAX_RD;
  }
  return Math.max(MIN_RD, Math.min(MAX_RD, rd));
}

function increaseRdForInactivity(rd, daysInactive = 0) {
  if (!Number.isFinite(daysInactive) || daysInactive <= 0) {
    return rd;
  }
  const increased = Math.sqrt(rd ** 2 + (INACTIVITY_INCREASE * Math.sqrt(daysInactive)) ** 2);
  return clampRd(increased);
}

function updateRating({ rating, ratingDeviation, volatility }, opponents) {
  if (!Array.isArray(opponents) || opponents.length === 0) {
    return {
      rating,
      ratingDeviation: clampRd(ratingDeviation),
      volatility,
      delta: 0
    };
  }

  const mu = toMu(rating);
  const phi = toPhi(ratingDeviation);
  const sigma = volatility;

  let vInverse = 0;
  let deltaSum = 0;
  opponents.forEach((opponent) => {
    const opponentMu = toMu(opponent.rating);
    const opponentPhi = toPhi(opponent.ratingDeviation);
    const gPhi = g(opponentPhi);
    const expected = E(mu, opponentMu, opponentPhi);
    vInverse += (gPhi ** 2) * expected * (1 - expected);
    deltaSum += gPhi * (opponent.score - expected);
  });
  const v = 1 / vInverse;
  const delta = v * deltaSum;

  const a = Math.log(sigma ** 2);
  const f = (x) => {
    const expX = Math.exp(x);
    const numerator = expX * (delta ** 2 - phi ** 2 - v - expX);
    const denominator = 2 * (phi ** 2 + v + expX) ** 2;
    return (numerator / denominator) - ((x - a) / (TAU ** 2));
  };

  let A = a;
  let B;
  if (delta ** 2 > phi ** 2 + v) {
    B = Math.log(delta ** 2 - phi ** 2 - v);
  } else {
    let k = 1;
    B = a - k * TAU;
    while (f(B) < 0) {
      k += 1;
      B = a - k * TAU;
    }
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }

  const sigmaPrime = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi ** 2 + sigmaPrime ** 2);
  const phiPrime = 1 / Math.sqrt((1 / phiStar ** 2) + (1 / v));
  const muPrime = mu + (phiPrime ** 2) * deltaSum;

  const ratingPrime = fromMu(muPrime);
  const rdPrime = clampRd(fromPhi(phiPrime));

  return {
    rating: ratingPrime,
    ratingDeviation: rdPrime,
    volatility: sigmaPrime,
    delta: ratingPrime - rating
  };
}

function createDefaultRating() {
  return {
    rating: BASE_RATING,
    ratingDeviation: BASE_RD,
    volatility: BASE_VOLATILITY
  };
}

function deriveTier(rating) {
  if (rating >= 2500) return '传奇';
  if (rating >= 2200) return '大师';
  if (rating >= 2000) return '宗师';
  if (rating >= 1800) return '钻石';
  if (rating >= 1600) return '铂金';
  if (rating >= 1400) return '黄金';
  if (rating >= 1200) return '白银';
  return '青铜';
}

module.exports = {
  BASE_RATING,
  BASE_RD,
  BASE_VOLATILITY,
  createDefaultRating,
  updateRating,
  increaseRdForInactivity,
  deriveTier
};
