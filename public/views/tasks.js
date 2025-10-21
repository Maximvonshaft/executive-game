import { showToast } from '../components/toast.js';
import { formatPercentage } from '../utils/format.js';

export async function renderTasks(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载任务中…</section>';
  try {
    const tasks = await apiClient.getTasks();
    mount.innerHTML = '';
    const container = document.createElement('section');
    container.className = 'stack';
    container.innerHTML = `
      <div class="surface surface--glass">
        <div class="heading heading--md">每日任务</div>
        <div class="list-grid" id="task-list"></div>
      </div>
    `;
    mount.appendChild(container);
    const list = container.querySelector('#task-list');
    tasks.forEach((task) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <header class="card__header">
          <span class="heading heading--sm">${task.title}</span>
          <span class="badge">奖励 ${task.reward} 金币</span>
        </header>
        <div class="card__body">
          <p>${task.description}</p>
          <div class="row" style="align-items: center; justify-content: space-between;">
            <span>进度 ${task.progress}/${task.target}</span>
            <div style="width: 120px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden;">
              <div style="width: ${formatPercentage(task.progress / task.target)}; height: 100%; background: var(--color-accent);"></div>
            </div>
          </div>
        </div>
        <footer class="row" style="justify-content: flex-end;">
          <button class="button" data-role="claim" ${task.claimed || task.progress < task.target ? 'disabled' : ''}>${task.claimed ? '已领取' : '领取奖励'}</button>
        </footer>
      `;
      card.querySelector('[data-role="claim"]').addEventListener('click', async () => {
        try {
          await apiClient.claimTask(task.id);
          showToast('领取成功', { variant: 'success' });
          renderTasks(apiClient, mount);
        } catch (error) {
          showToast(error.message, { variant: 'error' });
        }
      });
      list.appendChild(card);
    });
  } catch (error) {
    mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
  }
}
