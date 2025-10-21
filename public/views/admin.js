import { showToast } from '../components/toast.js';

function renderTaskTable(container, tasks, onUpdate) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>标题</th>
        <th>奖励</th>
        <th>目标</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  tasks.forEach((task) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${task.id}</td>
      <td><input value="${task.title}" data-field="title" /></td>
      <td><input value="${task.reward}" data-field="reward" type="number" min="0" /></td>
      <td><input value="${task.target}" data-field="target" type="number" min="1" /></td>
      <td><button class="button" data-role="save">保存</button></td>
    `;
    row.querySelector('[data-role="save"]').addEventListener('click', async () => {
      const payload = {};
      row.querySelectorAll('input').forEach((input) => {
        payload[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value;
      });
      await onUpdate(task.id, payload);
    });
    tbody.appendChild(row);
  });
  container.appendChild(table);
}

export async function renderAdmin(apiClient, mount) {
  mount.innerHTML = '<section class="surface surface--glass">加载运营后台…</section>';
  try {
    const tasks = await apiClient.adminListTasks();
    mount.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'stack';
    section.innerHTML = `
      <div class="surface surface--glass">
        <div class="heading heading--md">任务配置</div>
        <div id="admin-task-table"></div>
      </div>
      <div class="surface surface--glass">
        <div class="heading heading--md">多语言管理</div>
        <p class="text-muted">通过 /api/i18n 接口上传 JSON 资源，前端可热更新。</p>
      </div>
    `;
    mount.appendChild(section);
    renderTaskTable(section.querySelector('#admin-task-table'), tasks, async (id, payload) => {
      try {
        await apiClient.adminUpdateTask(id, payload);
        showToast('更新成功', { variant: 'success' });
        renderAdmin(apiClient, mount);
      } catch (error) {
        showToast(error.message, { variant: 'error' });
      }
    });
  } catch (error) {
    mount.innerHTML = `<section class="surface surface--glass">${error.message}</section>`;
  }
}
