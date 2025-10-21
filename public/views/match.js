import { showDialog } from '../components/dialog.js';
import { showToast } from '../components/toast.js';
import { formatDateTime } from '../utils/format.js';

export async function renderMatch(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载匹配信息…</section>';
  const games = await apiClient.getGames();
  mount.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'stack';
  section.innerHTML = `
    <div class="surface surface--glass">
      <header class="row" style="justify-content: space-between;">
        <div class="stack">
          <span class="heading heading--md">匹配队列</span>
          <span class="text-muted">选择玩法即可进入排队</span>
        </div>
        <span class="status-indicator" id="match-status">待选择</span>
      </header>
      <div class="list-grid" id="match-game-list"></div>
    </div>
    <div class="surface surface--glass">
      <div class="heading heading--md">排队记录</div>
      <div class="scroll-panel" id="match-log"></div>
    </div>
  `;
  mount.appendChild(section);

  const logPanel = section.querySelector('#match-log');
  const statusLabel = section.querySelector('#match-status');
  let activeTicket = null;

  function appendLog(entry) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="text-muted">${formatDateTime(Date.now())}</span><span>${entry}</span>`;
    logPanel.prepend(row);
  }

  function updateStatus(text, variant = 'neutral') {
    statusLabel.textContent = text;
    statusLabel.style.color = variant === 'success' ? 'var(--color-success)' : variant === 'danger' ? 'var(--color-danger)' : 'var(--color-accent-strong)';
  }

  async function startMatch(game) {
    try {
      updateStatus(`排队中 · ${game.name}`);
      const ticket = await apiClient.startMatch(game.id);
      activeTicket = ticket;
      appendLog(`进入 ${game.name} 匹配队列。`);
    } catch (error) {
      showToast(error.message, { variant: 'error' });
      updateStatus('排队失败', 'danger');
    }
  }

  async function cancelMatch() {
    if (!activeTicket) return;
    const ticketId = activeTicket.ticketId;
    try {
      await apiClient.cancelMatch(ticketId);
      appendLog('取消排队成功。');
      updateStatus('已取消');
      activeTicket = null;
    } catch (error) {
      showToast(error.message, { variant: 'error' });
    }
  }

  games.forEach((game) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <header class="card__header">
        <span class="heading heading--sm">${game.name}</span>
        <span class="text-muted">${game.description}</span>
      </header>
      <footer class="row" style="justify-content: flex-end;">
        <button class="button" data-role="match">进入排队</button>
        <button class="button button--danger" data-role="cancel">取消排队</button>
      </footer>
    `;
    card.querySelector('[data-role="match"]').addEventListener('click', () => startMatch(game));
    card.querySelector('[data-role="cancel"]').addEventListener('click', () => cancelMatch());
    section.querySelector('#match-game-list').appendChild(card);
  });

  showDialog({
    title: '断线重连提示',
    message: '对局中断线后，将自动尝试根据 sinceSeq 补偿恢复。请保持网络稳定以确保 200ms 内反馈。',
    confirmText: '知道了'
  });
}
