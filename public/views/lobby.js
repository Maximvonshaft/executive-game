import { formatDuration, formatChips } from '../utils/format.js';

function createGameCard(game, onSelect) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <header class="card__header">
      <div class="stack">
        <span class="heading heading--md">${game.name}</span>
        <span class="text-muted">${game.description}</span>
      </div>
      <span class="badge">${game.category || '实时'}</span>
    </header>
    <div class="card__body">
      <div class="row">
        <span class="tag">座位 ${game.maxPlayers}</span>
        <span class="tag">时限 ${formatDuration(game.turnDuration)}</span>
        <span class="tag">胜利 ${game.victoryCondition}</span>
      </div>
      <p class="text-muted">${game.meta?.highlights || ''}</p>
    </div>
    <footer class="row" style="justify-content: space-between;">
      <div class="chip-group">${formatChips(game.tags || [])}</div>
      <button class="button" data-role="play">立即对局</button>
    </footer>
  `;
  card.querySelector('[data-role="play"]').addEventListener('click', () => onSelect(game));
  return card;
}

function renderAnnouncements(container, announcements) {
  if (!announcements || announcements.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = '';
  announcements.forEach((announcement) => {
    const item = document.createElement('article');
    item.className = 'card surface--glass';
    item.innerHTML = `
      <header class="card__header">
        <span class="heading heading--sm">${announcement.title}</span>
        <span class="text-muted">${new Date(announcement.publishedAt).toLocaleDateString()}</span>
      </header>
      <p>${announcement.body}</p>
      ${announcement.link ? `<a class="button" href="${announcement.link}" target="_blank" rel="noopener">查看详情</a>` : ''}
    `;
    container.appendChild(item);
  });
}

export async function renderLobby(apiClient, mount, onPlay) {
  mount.innerHTML = '<section class="surface surface--glass">加载大厅数据…</section>';
  const [games, banners, announcements] = await Promise.all([
    apiClient.getGames(),
    apiClient.getBanners().catch(() => []),
    apiClient.getAnnouncements().catch(() => [])
  ]);
  const section = document.createElement('section');
  section.className = 'stack';
  section.innerHTML = `
    <div class="surface surface--glass">
      <div class="heading heading--md">活动与运营</div>
      <div id="lobby-announcements" class="stack"></div>
      <div class="list-grid" id="lobby-banners"></div>
    </div>
    <div class="surface surface--glass">
      <header class="row" style="justify-content: space-between; align-items: center;">
        <div class="stack">
          <span class="heading heading--md">最近游玩</span>
          <span class="text-muted">根据你的历史记录推荐</span>
        </div>
        <input type="search" placeholder="搜索玩法…" id="lobby-search" />
      </header>
      <div class="list-grid" id="lobby-games"></div>
    </div>
  `;
  mount.innerHTML = '';
  mount.appendChild(section);

  const bannerContainer = section.querySelector('#lobby-banners');
  banners.forEach((banner) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <header class="card__header">
        <span class="heading heading--sm">${banner.title}</span>
        <span class="badge">${banner.tagline || '活动'}</span>
      </header>
      <p>${banner.description}</p>
      ${banner.cta ? `<a class="button" href="${banner.cta.href}">${banner.cta.label}</a>` : ''}
    `;
    bannerContainer.appendChild(card);
  });

  renderAnnouncements(section.querySelector('#lobby-announcements'), announcements);

  const gamesContainer = section.querySelector('#lobby-games');
  const search = section.querySelector('#lobby-search');

  function applyFilter() {
    const keyword = search.value.trim().toLowerCase();
    gamesContainer.innerHTML = '';
    games
      .filter((game) => !keyword || game.name.toLowerCase().includes(keyword) || (game.tags || []).some((tag) => tag.toLowerCase().includes(keyword)))
      .forEach((game) => gamesContainer.appendChild(createGameCard(game, onPlay)));
  }

  search.addEventListener('input', () => {
    requestAnimationFrame(applyFilter);
  });

  applyFilter();
}
