import type { StateCreator } from 'zustand';

export type Orientation = 'portrait' | 'landscape';

export type UIScreen =
  | 'onboarding'
  | 'lobby'
  | 'game'
  | 'settings'
  | 'leaderboard'
  | 'shop'
  | 'tutorial';

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type UISlice = {
  ui: {
    currentScreen: UIScreen;
    onboardingStep: 0 | 1 | 2;
    onboardingCompleted: boolean;
    orientation: Orientation;
    aspectRatio: number;
    safeArea: SafeAreaInsets;
    landscapeRequired: boolean;
    landscapeHintVisible: boolean;
    selectedGameId: string | null;
  };
  setScreen: (screen: UIScreen) => void;
  setOrientation: (orientation: Orientation, aspectRatio: number) => void;
  setSafeArea: (insets: SafeAreaInsets) => void;
  setLandscapeRequired: (required: boolean) => void;
  setLandscapeHintVisible: (visible: boolean) => void;
  advanceOnboarding: () => void;
  resetOnboarding: () => void;
  completeOnboarding: () => void;
  selectGame: (gameId: string | null) => void;
};

const defaultInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export const createUISlice: StateCreator<
  UISlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  UISlice
> = (set) => ({
  ui: {
    currentScreen: 'onboarding',
    onboardingStep: 0,
    onboardingCompleted: false,
    orientation: 'portrait',
    aspectRatio: 16 / 9,
    safeArea: defaultInsets,
    landscapeRequired: false,
    landscapeHintVisible: false,
    selectedGameId: null
  },
  setScreen(screen) {
    set((draft) => {
      draft.ui.currentScreen = screen;
      if (screen !== 'game') {
        draft.ui.landscapeRequired = false;
      }
    });
  },
  setOrientation(orientation, aspectRatio) {
    set((draft) => {
      draft.ui.orientation = orientation;
      draft.ui.aspectRatio = aspectRatio;
      if (orientation === 'landscape') {
        draft.ui.landscapeHintVisible = false;
      }
    });
  },
  setSafeArea(insets) {
    set((draft) => {
      draft.ui.safeArea = insets;
    });
  },
  setLandscapeRequired(required) {
    set((draft) => {
      draft.ui.landscapeRequired = required;
    });
  },
  setLandscapeHintVisible(visible) {
    set((draft) => {
      draft.ui.landscapeHintVisible = visible;
    });
  },
  advanceOnboarding() {
    set((draft) => {
      const step = draft.ui.onboardingStep;
      if (step < 2) {
        draft.ui.onboardingStep = ((step + 1) as 0 | 1 | 2);
      } else {
        draft.ui.onboardingCompleted = true;
        draft.ui.currentScreen = 'lobby';
      }
    });
  },
  resetOnboarding() {
    set((draft) => {
      draft.ui.onboardingStep = 0;
      draft.ui.onboardingCompleted = false;
      draft.ui.currentScreen = 'onboarding';
    });
  },
  completeOnboarding() {
    set((draft) => {
      draft.ui.onboardingCompleted = true;
      draft.ui.currentScreen = 'lobby';
    });
  },
  selectGame(gameId) {
    set((draft) => {
      draft.ui.selectedGameId = gameId;
      if (gameId) {
        draft.ui.currentScreen = 'game';
        draft.ui.landscapeRequired = true;
      }
    });
  }
});
