import { showToast } from '../components/toast.js';
import { showDialog } from '../components/dialog.js';
import { formatDateTime } from '../utils/format.js';

function renderBoard(container, roomState) {
  container.innerHTML = '';
  if (!roomState || !roomState.board) {
    container.textContent = '等待房间数据…';
    return;
  }
  const board = document.createElement('div');
  board.className = 'replay-board';
  roomState.board.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'replay-board__cell';
      if (cell === 'B') cellEl.classList.add('replay-board__cell--black');
      if (cell === 'W') cellEl.classList.add('replay-board__cell--white');
      cellEl.title = `${rowIndex + 1}, ${columnIndex + 1}`;
      board.appendChild(cellEl);
    });
  });
  container.appendChild(board);
}

function renderTimeline(container, events = []) {
  container.innerHTML = '';
  events.slice().reverse().forEach((event) => {
    const item = document.createElement('div');
    item.className = 'timeline__item';
    item.innerHTML = `
      <div class="heading heading--sm">${event.type}</div>
      <div class="text-muted">${formatDateTime(event.createdAt)}</div>
      <pre style="white-space: pre-wrap;">${JSON.stringify(event.payload, null, 2)}</pre>
    `;
    container.appendChild(item);
  });
}

export async function renderRoom(apiClient, realtime, mount) {
  mount.innerHTML = '<section class="surface surface--glass">拉取房间状态…</section>';
  let snapshot = null;
  let events = [];
  let role = 'player';

  async function loadRoom() {
    try {
      const data = await apiClient.getActiveRoom();
      if (!data) {
        mount.innerHTML = '<section class="surface surface--glass">当前没有房间。</section>';
        return;
      }
      const join = await apiClient.joinRoom(data.roomId);
      snapshot = join.snapshot;
      events = join.events || [];
      role = join.role;
      render();
    } catch (error) {
      mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
    }
  }

  function render() {
    if (!snapshot) return;
    mount.innerHTML = '';
    const layout = document.createElement('section');
    layout.className = 'grid-two-column';
    layout.innerHTML = `
      <div class="stack">
        <div class="surface surface--glass">
          <header class="row" style="justify-content: space-between; align-items: center;">
            <div class="stack">
              <span class="heading heading--md">${snapshot.gameId.toUpperCase()} 房间</span>
              <span class="text-muted">角色：${role}</span>
            </div>
            ${snapshot.inviteCode ? `<span class="badge">邀请码 ${snapshot.inviteCode}</span>` : ''}
          </header>
          <div id="room-board"></div>
          <footer class="row" style="justify-content: flex-end;">
            <button class="button" id="room-ai-hint">AI 建议</button>
            <button class="button" id="room-refresh">刷新</button>
          </footer>
        </div>
        <div class="surface surface--glass">
          <div class="heading heading--md">座位</div>
          <div class="stack" id="room-seats"></div>
        </div>
      </div>
      <div class="stack">
        <div class="surface surface--glass">
          <header class="row" style="justify-content: space-between; align-items: center;">
            <span class="heading heading--md">事件时间轴</span>
            <button class="button" id="room-download">导出复盘</button>
          </header>
          <div class="timeline" id="room-timeline"></div>
        </div>
        <div class="surface surface--glass">
          <div class="heading heading--md">观战配置</div>
          <div class="stack">
            <div>观战人数：${snapshot.spectatorCount || 0}</div>
            <div>观战延迟：${snapshot.spectatorLatency || 0}ms</div>
            <div>可观战：${snapshot.allowSpectators ? '是' : '否'}</div>
          </div>
        </div>
      </div>
    `;
    mount.appendChild(layout);
    renderBoard(layout.querySelector('#room-board'), snapshot);
    renderTimeline(layout.querySelector('#room-timeline'), events);

    const seats = layout.querySelector('#room-seats');
    seats.innerHTML = '';
    (snapshot.players || []).forEach((player) => {
      const seat = document.createElement('div');
      seat.className = 'card';
      seat.innerHTML = `
        <header class="card__header">
          <span class="heading heading--sm">${player.displayName}</span>
          <span class="text-muted">${player.role}</span>
        </header>
        <div class="text-muted">Glicko ${player.rating}</div>
      `;
      seats.appendChild(seat);
    });

    layout.querySelector('#room-ai-hint').addEventListener('click', async () => {
      try {
        const suggestion = await apiClient.requestAiSuggestion(snapshot.roomId);
        showDialog({
          title: 'AI 建议',
          message: suggestion.message || JSON.stringify(suggestion, null, 2),
          confirmText: '继续对局'
        });
      } catch (error) {
        showToast(error.message, { variant: 'error' });
      }
    });

    layout.querySelector('#room-refresh').addEventListener('click', () => loadRoom());
    layout.querySelector('#room-download').addEventListener('click', async () => {
      try {
        const replay = await apiClient.getReplay(snapshot.matchId);
        const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `match-${snapshot.matchId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        showToast('下载复盘失败', { variant: 'error' });
      }
    });
  }

  realtime.on('room_state', (event) => {
    snapshot = { ...snapshot, ...event.state };
    render();
  });

  realtime.on('match_started', (event) => {
    events.push({ type: 'match_started', createdAt: event.createdAt, payload: event });
    showToast('对局开始', { variant: 'success' });
    render();
  });

  realtime.on('action_applied', (event) => {
    events.push({ type: 'action', createdAt: event.createdAt, payload: event });
    if (snapshot && snapshot.board && event.move) {
      snapshot.board[event.move.y][event.move.x] = event.move.player === 'black' ? 'B' : 'W';
    }
    render();
  });

  realtime.on('match_result', (event) => {
    events.push({ type: 'result', createdAt: event.createdAt, payload: event });
    showDialog({
      title: '对局结束',
      message: `${event.winner ? `胜者：${event.winner}` : '平局'}\n用时：${event.duration}s`,
      confirmText: '查看复盘'
    });
    render();
  });

  await loadRoom();
}
