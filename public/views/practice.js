import { showToast } from '../components/toast.js';

export async function renderPractice(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载练习模式…</section>';
  try {
    const scenarios = await apiClient.getPracticeScenarios();
    mount.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'stack';
    section.innerHTML = `
      <div class="surface surface--glass">
        <div class="heading heading--md">练习模式</div>
        <div class="text-muted">与排位进度隔离，支持残局、教程与 AI 陪练</div>
      </div>
      <div class="list-grid" id="practice-list"></div>
    `;
    mount.appendChild(section);
    const list = section.querySelector('#practice-list');
    scenarios.forEach((scenario) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <header class="card__header">
          <span class="heading heading--sm">${scenario.title}</span>
          <span class="badge">${scenario.difficulty}</span>
        </header>
        <p class="text-muted">${scenario.description}</p>
        <footer class="row" style="justify-content: flex-end;">
          <button class="button" data-scenario="${scenario.id}">开始练习</button>
        </footer>
      `;
      card.querySelector('[data-scenario]').addEventListener('click', async () => {
        try {
          await apiClient.requestAiSuggestion(scenario.id);
          showToast('已为你准备 AI 陪练房间', { variant: 'success' });
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
