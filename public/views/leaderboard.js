import { formatRank, formatPercentage } from '../utils/format.js';

function renderTable(container, entries) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>玩家</th>
        <th>段位</th>
        <th>胜率</th>
        <th>场次</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const body = table.querySelector('tbody');
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.player.displayName}</td>
      <td>${formatRank(entry.rank)}</td>
      <td>${formatPercentage(entry.winRate)}</td>
      <td>${entry.matches}</td>
    `;
    body.appendChild(row);
  });
  container.appendChild(table);
}

export async function renderLeaderboard(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载排行榜…</section>';
  const container = document.createElement('section');
  container.className = 'stack';
  container.innerHTML = `
    <div class="surface surface--glass">
      <div class="tab-bar" role="tablist">
        <button class="tab-bar__button" role="tab" data-range="overall" aria-selected="true">总榜</button>
        <button class="tab-bar__button" role="tab" data-range="weekly">7 天</button>
        <button class="tab-bar__button" role="tab" data-range="monthly">30 天</button>
      </div>
      <div id="leaderboard-table"></div>
    </div>
  `;
  mount.innerHTML = '';
  mount.appendChild(container);

  const tableContainer = container.querySelector('#leaderboard-table');

  async function load(range) {
    container.querySelectorAll('[role="tab"]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.range === range)));
    tableContainer.innerHTML = '加载中…';
    const entries = await apiClient.getLeaderboard(range);
    renderTable(tableContainer, entries);
  }

  container.querySelectorAll('[role="tab"]').forEach((btn) => {
    btn.addEventListener('click', () => load(btn.dataset.range));
  });

  load('overall');
}
