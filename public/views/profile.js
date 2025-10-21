import { getState } from '../core/state.js';
import { formatRank, formatDateTime, formatPercentage } from '../utils/format.js';

export async function renderProfile(apiClient, mount) {
  const session = getState('session');
  if (!session) {
    mount.innerHTML = '<section class="surface surface--glass">请先登录</section>';
    return;
  }
  mount.innerHTML = '<section class="surface surface--glass">加载资料卡…</section>';
  try {
    const profile = await apiClient.getProfile(session.profile.id);
    mount.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'stack';
    section.innerHTML = `
      <div class="surface surface--glass">
        <header class="row" style="justify-content: space-between; align-items: center;">
          <div class="stack">
            <span class="heading heading--md">${profile.displayName}</span>
            <span class="text-muted">${formatRank(profile.rank)}</span>
          </div>
          <button class="button" id="profile-share">导出分享卡片</button>
        </header>
        <div class="row">
          <div class="card">
            <span class="heading heading--sm">胜率</span>
            <span class="heading heading--lg">${formatPercentage(profile.winRate)}</span>
          </div>
          <div class="card">
            <span class="heading heading--sm">连胜</span>
            <span class="heading heading--lg">${profile.streak} 场</span>
          </div>
          <div class="card">
            <span class="heading heading--sm">总场次</span>
            <span class="heading heading--lg">${profile.matches}</span>
          </div>
        </div>
      </div>
      <div class="surface surface--glass">
        <div class="heading heading--md">最近战绩</div>
        <div class="stack" id="profile-recent"></div>
      </div>
      <div class="surface surface--glass">
        <div class="heading heading--md">成就徽章</div>
        <div class="chip-group">${(profile.badges || []).map((badge) => `<span class="chip">${badge}</span>`).join('')}</div>
      </div>
    `;
    mount.appendChild(section);

    const recent = section.querySelector('#profile-recent');
    (profile.recentMatches || []).forEach((match) => {
      const item = document.createElement('article');
      item.className = 'card';
      item.innerHTML = `
        <header class="card__header">
          <span class="heading heading--sm">${match.gameName}</span>
          <span class="badge">${match.result}</span>
        </header>
        <div class="text-muted">${formatDateTime(match.finishedAt)}</div>
        <div class="row" style="justify-content: flex-end;">
          <button class="button" data-replay="${match.matchId}">查看复盘</button>
        </div>
      `;
      item.querySelector('[data-replay]').addEventListener('click', async () => {
        const replay = await apiClient.getReplay(match.matchId);
        const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `match-${match.matchId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
      recent.appendChild(item);
    });

    section.querySelector('#profile-share').addEventListener('click', () => {
      const shareText = `Executive Arena | ${profile.displayName}\n段位：${formatRank(profile.rank)}\n胜率：${formatPercentage(profile.winRate)}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('已复制分享文案');
      });
    });
  } catch (error) {
    mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
  }
}
