import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';

export type Banner = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
  tags?: string[];
  activeFrom?: number | null;
  activeTo?: number | null;
};

export type Announcement = {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
};

export type AccessibilityConfig = {
  minimumContrastRatio: number;
  supportsHighContrastMode: boolean;
  dynamicTextScale: boolean;
  prefersReducedMotion: boolean;
  supportsRTL: boolean;
};

export type AnnouncementSlice = {
  announcement: {
    data: Announcement | null;
    version: number | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  banners: {
    items: Banner[];
    version: number | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  accessibility: {
    settings: AccessibilityConfig | null;
    version: number | null;
  };
  i18n: {
    resources: Record<string, unknown>;
    version: number | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  fetchOperationalContent: () => Promise<void>;
};

export const createAnnouncementSlice: StateCreator<
  AnnouncementSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  AnnouncementSlice
> = (set) => ({
  announcement: {
    data: null,
    version: null,
    status: 'idle'
  },
  banners: {
    items: [],
    version: null,
    status: 'idle'
  },
  accessibility: {
    settings: null,
    version: null
  },
  i18n: {
    resources: {},
    version: null,
    status: 'idle'
  },
  async fetchOperationalContent() {
    set((draft) => {
      draft.announcement.status = 'loading';
      draft.banners.status = 'loading';
      draft.i18n.status = 'loading';
      draft.announcement.error = undefined;
      draft.banners.error = undefined;
      draft.i18n.error = undefined;
    });
    try {
      const [announcementRes, bannerRes, accessibilityRes, i18nRes] = await Promise.all([
        getRestClient().request<{ version: number; announcement: Announcement | null }>('/announcement'),
        getRestClient().request<{ version: number; banners: Banner[] }>('/banners'),
        getRestClient().request<{ accessibility: { version: number; settings: AccessibilityConfig } }>(
          '/accessibility'
        ),
        getRestClient().request<{
          version: number;
          resources: Record<string, unknown>;
          fallbackLanguage: string;
        }>('/i18n')
      ]);
      set((draft) => {
        draft.announcement.data = announcementRes.announcement;
        draft.announcement.version = announcementRes.version;
        draft.announcement.status = 'ready';
        draft.banners.items = bannerRes.banners;
        draft.banners.version = bannerRes.version;
        draft.banners.status = 'ready';
        draft.accessibility.settings = accessibilityRes.accessibility.settings;
        draft.accessibility.version = accessibilityRes.accessibility.version;
        draft.i18n.resources = i18nRes.resources;
        draft.i18n.version = i18nRes.version;
        draft.i18n.status = 'ready';
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '运营内容加载失败';
      set((draft) => {
        draft.announcement.status = 'error';
        draft.banners.status = 'error';
        draft.i18n.status = 'error';
        draft.announcement.error = message;
        draft.banners.error = message;
        draft.i18n.error = message;
      });
      throw error;
    }
  }
});
