import { getState, subscribe } from '../core/state.js';
import { formatRank } from '../utils/format.js';

let headerSubscribed = false;

export function renderHeader(onLogout) {
  const header = document.getElementById('shell-header');
  if (!header) return;
  const session = getState('session');
  const profileSection = session
    ? `<div class="row">
        <div>
          <div class="heading heading--sm">${session.profile?.displayName || '玩家'}</div>
          <div class="text-muted">${formatRank(session.profile?.rank)}</div>
        </div>
        <button class="button" id="logout-btn">退出</button>
      </div>`
    : '<div class="text-muted">未登录</div>';
  header.innerHTML = `
    <div class="surface surface--glass">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div class="stack">
          <span class="badge">Executive Arena</span>
          <h1 class="heading heading--lg">实时对战控制台</h1>
          <p class="text-muted">黑金主题 · 安全区适配 · 200ms 动作反馈保障</p>
        </div>
        ${profileSection}
      </div>
    </div>
  `;
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => onLogout && onLogout());
  }
  if (!headerSubscribed) {
    headerSubscribed = true;
    subscribe('session', () => renderHeader(onLogout));
  }
}
