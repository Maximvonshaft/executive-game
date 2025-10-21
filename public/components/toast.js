const container = () => document.getElementById('toast-root');

function createToastElement(message, options) {
  const el = document.createElement('div');
  el.className = `toast toast--${options.variant || 'info'}`;
  el.innerHTML = `
    <div class="toast__body">
      <span>${message}</span>
    </div>
  `;
  return el;
}

export function showToast(message, options = {}) {
  const root = container();
  if (!root) return;
  const toast = createToastElement(message, options);
  root.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });
  const ttl = options.ttl || 2600;
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 260);
  }, ttl);
}

const style = document.createElement('style');
style.textContent = `
.toast {
  pointer-events: auto;
  margin: 0 auto var(--spacing-unit);
  padding: calc(var(--spacing-unit) * 1.5) calc(var(--spacing-unit) * 2);
  border-radius: var(--radius-medium);
  border: 1px solid rgba(212, 175, 55, 0.16);
  background: rgba(14, 18, 20, 0.88);
  min-width: min(92vw, 420px);
  max-width: min(92vw, 420px);
  opacity: 0;
  transform: translateY(-16px);
  transition: opacity 0.24s ease, transform 0.24s ease;
}
.toast--visible {
  opacity: 1;
  transform: translateY(0);
}
.toast--error {
  border-color: rgba(255, 107, 107, 0.4);
  color: var(--color-danger);
}
.toast--success {
  border-color: rgba(53, 208, 127, 0.4);
  color: var(--color-success);
}
.toast__body {
  display: flex;
  gap: calc(var(--spacing-unit));
  align-items: center;
}
`;
document.head.appendChild(style);
