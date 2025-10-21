import { setState, getState } from '../core/state.js';
import { showToast } from '../components/toast.js';

export class I18nManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async load(locale) {
    try {
      const messages = await this.apiClient.loadI18n(locale);
      setState('i18n', { locale, messages });
    } catch (error) {
      showToast('加载多语言资源失败，已回退到默认语言', { variant: 'error' });
    }
  }

  t(key, fallback) {
    const { messages } = getState('i18n');
    return messages?.[key] || fallback || key;
  }
}
