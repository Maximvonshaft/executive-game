import { showToast } from '../components/toast.js';

function renderFriendList(container, friends, onRemove) {
  container.innerHTML = '';
  friends.forEach((friend) => {
    const row = document.createElement('article');
    row.className = 'card';
    row.innerHTML = `
      <header class="card__header">
        <span class="heading heading--sm">${friend.displayName}</span>
        <span class="text-muted">${friend.status}</span>
      </header>
      <div class="row" style="justify-content: flex-end;">
        <button class="button button--danger" data-remove="${friend.id}">解除关系</button>
      </div>
    `;
    row.querySelector('[data-remove]').addEventListener('click', () => onRemove(friend));
    container.appendChild(row);
  });
}

export async function renderFriends(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载好友列表…</section>';
  try {
    const data = await apiClient.getFriends();
    mount.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'grid-two-column';
    section.innerHTML = `
      <div class="stack">
        <div class="surface surface--glass">
          <div class="heading heading--md">好友</div>
          <div class="stack" id="friend-list"></div>
        </div>
        <div class="surface surface--glass">
          <div class="heading heading--md">屏蔽名单</div>
          <div class="stack" id="block-list"></div>
        </div>
      </div>
      <div class="surface surface--glass">
        <div class="heading heading--md">添加好友 / 搜索</div>
        <form id="friend-form" class="stack">
          <input name="playerId" placeholder="输入玩家 ID" required />
          <div class="row" style="justify-content: flex-end;">
            <button class="button" type="submit">添加好友</button>
          </div>
        </form>
        <div class="surface surface--glass" id="recent-opponents">
          <div class="heading heading--sm">最近对手</div>
          <div class="stack"></div>
        </div>
      </div>
    `;
    mount.appendChild(section);

    renderFriendList(section.querySelector('#friend-list'), data.friends || [], async (friend) => {
      await apiClient.removeFriend(friend.id);
      showToast('已移除好友', { variant: 'success' });
      renderFriends(apiClient, mount);
    });

    renderFriendList(section.querySelector('#block-list'), data.blocked || [], async (friend) => {
      await apiClient.unblockPlayer(friend.id);
      showToast('已解除屏蔽', { variant: 'success' });
      renderFriends(apiClient, mount);
    });

    const recentContainer = section.querySelector('#recent-opponents .stack');
    (data.recentOpponents || []).forEach((opponent) => {
      const item = document.createElement('div');
      item.className = 'card';
      item.innerHTML = `
        <div class="heading heading--sm">${opponent.displayName}</div>
        <div class="text-muted">上次对局 ${new Date(opponent.lastPlayedAt).toLocaleString()}</div>
        <div class="row" style="justify-content: flex-end;">
          <button class="button" data-add="${opponent.id}">加为好友</button>
        </div>
      `;
      item.querySelector('[data-add]').addEventListener('click', async () => {
        await apiClient.addFriend(opponent.id);
        showToast('好友请求已发送', { variant: 'success' });
        renderFriends(apiClient, mount);
      });
      recentContainer.appendChild(item);
    });

    section.querySelector('#friend-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const playerId = formData.get('playerId');
      if (!playerId) return;
      try {
        await apiClient.addFriend(playerId);
        showToast('好友请求已发送', { variant: 'success' });
        event.target.reset();
        renderFriends(apiClient, mount);
      } catch (error) {
        showToast(error.message, { variant: 'error' });
      }
    });
  } catch (error) {
    mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
  }
}
