import { showToast } from '../components/toast.js';

function detectInitData() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    const initData = window.Telegram.WebApp.initData;
    if (initData && initData.length > 0) {
      return initData;
    }
  }
  const params = new URLSearchParams(window.location.search);
  if (params.has('initData')) {
    return params.get('initData');
  }
  return null;
}

export async function ensureLogin(apiClient) {
  const initData = detectInitData();
  if (!initData) {
    showToast('未检测到 Telegram initData，请在 Telegram 内打开。', { variant: 'error' });
    return null;
  }
  return apiClient.loginWithTelegram(initData);
}
