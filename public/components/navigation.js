const NAV_LINKS = [
  { id: 'lobby', label: '大厅' },
  { id: 'match', label: '匹配' },
  { id: 'room', label: '房间' },
  { id: 'leaderboard', label: '排行' },
  { id: 'tasks', label: '任务' },
  { id: 'profile', label: '资料' },
  { id: 'friends', label: '好友' },
  { id: 'practice', label: '练习' },
  { id: 'observability', label: '观测' },
  { id: 'admin', label: '运营' }
];

export function renderNavigation(current, onNavigate) {
  const nav = document.getElementById('shell-nav');
  if (!nav) return;
  nav.innerHTML = '';
  NAV_LINKS.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.textContent = item.label;
    if (current === item.id) {
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => onNavigate(item.id));
    nav.appendChild(button);
  });
}
