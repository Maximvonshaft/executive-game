function getRoot() {
  return document.getElementById('dialog-root');
}

export function showDialog({ title, message, confirmText = '确定', cancelText = null, onConfirm, onCancel }) {
  const root = getRoot();
  if (!root) return () => {};
  const dialog = document.createElement('div');
  dialog.className = 'dialog-overlay';
  dialog.innerHTML = `
    <div class="dialog surface surface--glass" role="alertdialog" aria-modal="true">
      <header class="dialog__header">
        <h2 class="heading heading--md">${title}</h2>
      </header>
      <div class="dialog__body">
        <p>${message}</p>
      </div>
      <footer class="dialog__footer row">
        ${cancelText ? `<button class="button" data-role="cancel">${cancelText}</button>` : ''}
        <button class="button" data-role="confirm">${confirmText}</button>
      </footer>
    </div>
  `;
  function close() {
    dialog.classList.remove('dialog-overlay--visible');
    setTimeout(() => dialog.remove(), 180);
  }
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      close();
      if (onCancel) onCancel();
    }
  });
  const confirmBtn = dialog.querySelector('[data-role="confirm"]');
  confirmBtn.addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });
  const cancelBtn = dialog.querySelector('[data-role="cancel"]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      close();
      if (onCancel) onCancel();
    });
  }
  root.appendChild(dialog);
  requestAnimationFrame(() => dialog.classList.add('dialog-overlay--visible'));
  return close;
}

const style = document.createElement('style');
style.textContent = `
.dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 6, 8, 0.72);
  backdrop-filter: blur(16px);
  opacity: 0;
  transition: opacity 0.18s ease;
}
.dialog-overlay--visible {
  opacity: 1;
}
.dialog {
  width: min(92vw, 420px);
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 2);
}
.dialog__footer {
  justify-content: flex-end;
}
`;
document.head.appendChild(style);
