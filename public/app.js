import { createApiClient } from './api/client.js';
import { createRealtimeManager } from './api/realtime.js';
import { renderNavigation } from './components/navigation.js';
import { renderHeader } from './components/header.js';
import { ensureLogin } from './views/auth.js';
import { renderLobby } from './views/lobby.js';
import { renderMatch } from './views/match.js';
import { renderRoom } from './views/room.js';
import { renderTasks } from './views/tasks.js';
import { renderLeaderboard } from './views/leaderboard.js';
import { renderProfile } from './views/profile.js';
import { renderFriends } from './views/friends.js';
import { renderPractice } from './views/practice.js';
import { renderObservability } from './views/observability.js';
import { renderAdmin } from './views/admin.js';
import { I18nManager } from './i18n/manager.js';
import { getState } from './core/state.js';
import { showToast } from './components/toast.js';

const apiClient = createApiClient();
const realtime = createRealtimeManager();
const i18n = new I18nManager(apiClient);

const VIEWS = {
  lobby: (mount) => renderLobby(apiClient, mount, (game) => navigate('match', { gameId: game.id })),
  match: (mount, params) => renderMatch(apiClient, mount, params),
  room: (mount) => renderRoom(apiClient, realtime, mount),
  leaderboard: (mount) => renderLeaderboard(apiClient, mount),
  tasks: (mount) => renderTasks(apiClient, mount),
  profile: (mount) => renderProfile(apiClient, mount),
  friends: (mount) => renderFriends(apiClient, mount),
  practice: (mount) => renderPractice(apiClient, mount),
  observability: (mount) => renderObservability(apiClient, mount),
  admin: (mount) => renderAdmin(apiClient, mount)
};

let currentView = 'lobby';
let viewParams = {};

function navigate(view, params = {}) {
  currentView = view;
  viewParams = params;
  renderNavigation(currentView, navigate);
  const mount = document.getElementById('shell-main');
  if (!mount) return;
  const renderer = VIEWS[view];
  if (!renderer) {
    mount.innerHTML = '<section class="surface surface--glass">页面建设中…</section>';
    return;
  }
  renderer(mount, params);
}

async function bootstrap() {
  document.body.classList.add('loading');
  const session = getState('session');
  if (!session) {
    await ensureLogin(apiClient);
  }
  await apiClient.refreshProfile().catch(() => {});
  await i18n.load('zh-CN');
  renderHeader(async () => {
    await apiClient.logout();
    showToast('已退出登录', { variant: 'success' });
    await ensureLogin(apiClient);
    await apiClient.refreshProfile();
    navigate('lobby');
  });
  renderNavigation(currentView, navigate);
  document.body.classList.remove('loading');
  navigate('lobby');
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    document.body.classList.remove('loading');
    showToast('初始化失败，请重试', { variant: 'error' });
  });
});
