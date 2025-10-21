import { updateTelemetry } from '../core/state.js';
import { showToast } from '../components/toast.js';

function renderMetrics(container, metrics) {
  container.innerHTML = '';
  Object.entries(metrics || {}).forEach(([key, value]) => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <span class="text-muted">${key}</span>
      <span class="heading heading--md">${value}</span>
    `;
    container.appendChild(card);
  });
}

function renderLogs(container, logs) {
  container.innerHTML = '';
  logs.forEach((log) => {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="text-muted">${new Date(log.timestamp).toLocaleString()}</div>
      <pre style="white-space: pre-wrap;">${log.message}</pre>
    `;
    container.appendChild(row);
  });
}

export async function renderObservability(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载观测数据…</section>';
  try {
    const data = await apiClient.getObservabilityMetrics();
    updateTelemetry({ metrics: data.metrics, logs: data.logs });
    mount.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'grid-two-column';
    section.innerHTML = `
      <div class="surface surface--glass">
        <div class="heading heading--md">关键指标</div>
        <div class="metric-grid" id="obs-metrics"></div>
      </div>
      <div class="surface surface--glass">
        <div class="heading heading--md">实时日志</div>
        <div class="scroll-panel" id="obs-logs"></div>
        <button class="button" id="obs-refresh">刷新</button>
      </div>
    `;
    mount.appendChild(section);

    const metricsEl = section.querySelector('#obs-metrics');
    const logsEl = section.querySelector('#obs-logs');

    function apply(data) {
      renderMetrics(metricsEl, data.metrics);
      renderLogs(logsEl, data.logs || []);
    }

    apply(data);

    section.querySelector('#obs-refresh').addEventListener('click', async () => {
      try {
        const next = await apiClient.getObservabilityMetrics();
        updateTelemetry({ metrics: next.metrics, logs: next.logs });
        apply(next);
      } catch (error) {
        showToast('刷新失败', { variant: 'error' });
      }
    });
  } catch (error) {
    mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
  }
}
