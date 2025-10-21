export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${seconds.toFixed(0)}s`;
  return `${minutes}m ${remainder.toFixed(0)}s`;
}

export function formatRank(rank) {
  if (!rank) return '未定级';
  const tier = rank.tier || rank.name || '无段位';
  const rating = rank.rating ? `${Math.round(rank.rating)}` : '';
  return `${tier}${rating ? ` · ${rating}` : ''}`;
}

export function formatPercentage(value) {
  if (value === null || value === undefined) return '--';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  return date.toLocaleString();
}

export function formatChips(chips) {
  if (!Array.isArray(chips)) return '';
  return chips.map((chip) => `<span class="chip">${chip}</span>`).join('');
}
