import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalStore } from './state/globalStore';
import { useTheme } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { useToast } from './providers/ToastProvider';
import { Dialog } from './components/Dialog';
import { resolveTelegramInitData } from './utils/telegram';
import { AppHeader } from './components/AppHeader';
import { PrimaryNavigation } from './components/PrimaryNavigation';
import { OrientationGuard } from './components/OrientationGuard';
import { gameCatalog } from './constants/gameCatalog';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShopScreen } from './screens/ShopScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { useOrientation } from './hooks/useOrientation';

export function App() {
  const {
    initializeSession,
    sessionStatus,
    sessionError,
    authenticateWithTelegram,
    sessionUser,
    clearSession,
    fetchOperationalContent,
    fetchLeaderboard,
    leaderboard,
    fetchDailyTasks,
    tasks,
    banners,
    ui,
    setScreen,
    setOrientation: setUiOrientation,
    setSafeArea,
    setLandscapeRequired,
    setLandscapeHintVisible,
    advanceOnboarding,
    completeOnboarding,
    resetOnboarding,
    selectGame
  } = useGlobalStore((state) => ({
    initializeSession: state.initializeSession,
    sessionStatus: state.session.status,
    sessionError: state.session.error,
    authenticateWithTelegram: state.authenticateWithTelegram,
    sessionUser: state.session.user,
    clearSession: state.clearSession,
    fetchOperationalContent: state.fetchOperationalContent,
    fetchLeaderboard: state.fetchLeaderboard,
    leaderboard: state.leaderboard,
    fetchDailyTasks: state.fetchDailyTasks,
    tasks: state.tasks.items,
    banners: state.banners.items,
    ui: state.ui,
    setScreen: state.setScreen,
    setOrientation: state.setOrientation,
    setSafeArea: state.setSafeArea,
    setLandscapeRequired: state.setLandscapeRequired,
    setLandscapeHintVisible: state.setLandscapeHintVisible,
    advanceOnboarding: state.advanceOnboarding,
    completeOnboarding: state.completeOnboarding,
    resetOnboarding: state.resetOnboarding,
    selectGame: state.selectGame
  }));
  const { toggleContrast, isHighContrast } = useTheme();
  const toast = useToast();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualInitData, setManualInitData] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const orientationInfo = useOrientation();
  const isInitializing = useMemo(
    () => sessionStatus === 'initializing' || isAuthenticating,
    [sessionStatus, isAuthenticating]
  );

  useEffect(() => {
    setUiOrientation(orientationInfo.orientation, orientationInfo.aspectRatio);
    setSafeArea(orientationInfo.safeArea);
    if (ui.landscapeRequired && orientationInfo.orientation !== 'landscape') {
      setLandscapeHintVisible(true);
    }
  }, [orientationInfo, setUiOrientation, setSafeArea, ui.landscapeRequired, setLandscapeHintVisible]);

  useEffect(() => {
    if (ui.currentScreen === 'leaderboard' && leaderboard.status === 'idle') {
      fetchLeaderboard().catch((error) => {
        toast.present({ title: '排行榜加载失败', description: String(error), tone: 'critical' });
      });
    }
  }, [ui.currentScreen, leaderboard.status, fetchLeaderboard, toast]);

  useEffect(() => {
    initializeSession().catch((error) => {
      toast.present({ title: '初始化失败', description: error instanceof Error ? error.message : String(error), tone: 'critical' });
    });
  }, [initializeSession, toast]);

  useEffect(() => {
    fetchOperationalContent().catch((error) => {
      toast.present({
        title: '运营内容加载失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        tone: 'caution'
      });
    });
    fetchDailyTasks().catch((error) => {
      toast.present({
        title: '任务获取失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        tone: 'caution'
      });
    });
  }, [fetchOperationalContent, fetchDailyTasks, toast]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && ui.currentScreen === 'onboarding' && ui.onboardingStep === 0) {
      advanceOnboarding();
    }
  }, [sessionStatus, ui.currentScreen, ui.onboardingStep, advanceOnboarding]);

  const performAuthentication = useCallback(
    async (initData: string) => {
      setIsAuthenticating(true);
      try {
        await authenticateWithTelegram(initData);
        setManualInitData('');
        toast.present({ title: '登录成功', description: '已获取玩家身份令牌', tone: 'positive' });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : '登录失败，请稍后重试';
        toast.present({ title: '登录失败', description: message, tone: 'critical' });
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [authenticateWithTelegram, toast]
  );

  const handleTelegramLogin = useCallback(async () => {
    const resolved = resolveTelegramInitData();
    if (!resolved) {
      toast.present({
        title: '未检测到 Telegram 登录数据',
        description: '请在 Telegram Mini App 中打开，或手动粘贴 initData 完成登录',
        tone: 'caution'
      });
      setManualDialogOpen(true);
      return;
    }
    const success = await performAuthentication(resolved.value);
    if (!success) {
      setManualDialogOpen(true);
    }
  }, [performAuthentication, toast]);

  const handleManualSubmit = useCallback(async () => {
    const value = manualInitData.trim();
    if (!value) {
      toast.present({
        title: '缺少 initData',
        description: '请粘贴从 Telegram Mini App 获取的 initData 字符串',
        tone: 'caution'
      });
      return false;
    }
    return performAuthentication(value);
  }, [manualInitData, performAuthentication, toast]);

  const handleLogout = useCallback(() => {
    clearSession();
    resetOnboarding();
    toast.present({ title: '已退出登录', tone: 'default' });
  }, [clearSession, resetOnboarding, toast]);

  const handleOnboardingNext = useCallback(() => {
    if (ui.onboardingStep === 2) {
      completeOnboarding();
      setScreen('lobby');
      return;
    }
    advanceOnboarding();
  }, [ui.onboardingStep, advanceOnboarding, completeOnboarding, setScreen]);

  const handleGuestLogin = useCallback(() => {
    toast.present({ title: '游客模式', description: '已启用游客体验，可随时绑定账号', tone: 'default' });
    advanceOnboarding();
  }, [advanceOnboarding, toast]);

  const activeGame = useMemo(
    () => gameCatalog.find((item) => item.id === ui.selectedGameId) ?? gameCatalog[0],
    [ui.selectedGameId]
  );

  const renderedScreen = useMemo(() => {
    switch (ui.currentScreen) {
      case 'onboarding':
        return (
          <OnboardingScreen
            step={ui.onboardingStep}
            sessionStatus={sessionStatus}
            onTelegramLogin={handleTelegramLogin}
            onManualLogin={() => setManualDialogOpen(true)}
            onGuestLogin={handleGuestLogin}
            isAuthenticating={isAuthenticating}
            selectedAvatar={selectedAvatar}
            onSelectAvatar={setSelectedAvatar}
            onNext={handleOnboardingNext}
          />
        );
      case 'lobby':
        return (
          <LobbyScreen
            games={gameCatalog}
            banners={banners}
            tasks={tasks}
            leaderboard={leaderboard.entries}
            onSelectGame={(id) => {
              selectGame(id);
              setLandscapeRequired(true);
              if (orientationInfo.orientation !== 'landscape') {
                setLandscapeHintVisible(true);
              }
            }}
            onOpenLeaderboard={() => setScreen('leaderboard')}
            onOpenSettings={() => setScreen('settings')}
            onOpenShop={() => setScreen('shop')}
          />
        );
      case 'game':
        return <GameScreen game={activeGame} safeArea={ui.safeArea} orientation={ui.orientation} onExit={() => setScreen('lobby')} />;
      case 'leaderboard':
        return (
          <LeaderboardScreen
            scope={leaderboard.scope}
            entries={leaderboard.entries}
            generatedAt={leaderboard.generatedAt}
            status={leaderboard.status}
            error={leaderboard.error}
            onScopeChange={(scope) => fetchLeaderboard(scope).catch(() => undefined)}
            onRefresh={() => fetchLeaderboard().catch(() => undefined)}
          />
        );
      case 'settings':
        return <SettingsScreen />;
      case 'shop':
        return <ShopScreen />;
      case 'tutorial':
        return <TutorialScreen onReturn={() => setScreen('lobby')} />;
      default:
        return null;
    }
  }, [
    ui.currentScreen,
    ui.onboardingStep,
    sessionStatus,
    handleTelegramLogin,
    handleGuestLogin,
    isAuthenticating,
    selectedAvatar,
    handleOnboardingNext,
    banners,
    tasks,
    leaderboard,
    selectGame,
    setLandscapeRequired,
    orientationInfo.orientation,
    setLandscapeHintVisible,
    setScreen,
    activeGame,
    ui.safeArea,
    ui.orientation,
    fetchLeaderboard
  ]);

  return (
    <Layout.SafeArea background="surface">
      <Layout.Screen maxWidth={1400}>
        <AppHeader
          orientation={ui.orientation}
          aspectRatio={ui.aspectRatio}
          safeArea={ui.safeArea}
          currentScreen={ui.currentScreen}
          onNavigate={setScreen}
          onToggleContrast={() => toggleContrast()}
          isHighContrast={isHighContrast}
          sessionStatus={sessionStatus}
          sessionUser={sessionUser}
          onLogout={sessionStatus === 'authenticated' ? handleLogout : undefined}
          onResetOnboarding={ui.onboardingCompleted ? resetOnboarding : undefined}
        />
        {sessionError && ui.currentScreen !== 'onboarding' ? (
          <div style={{ color: 'var(--color-critical)', fontSize: 14 }}>会话异常：{sessionError}</div>
        ) : null}
        {renderedScreen}
        {ui.currentScreen !== 'onboarding' ? (
          <PrimaryNavigation
            currentScreen={ui.currentScreen}
            onNavigate={setScreen}
            onOpenTutorial={() => setScreen('tutorial')}
            disabled={isInitializing}
            orientation={ui.orientation}
          />
        ) : null}
      </Layout.Screen>
      <OrientationGuard
        active={ui.landscapeRequired && ui.landscapeHintVisible}
        orientation={ui.orientation}
        recommended="landscape"
        onContinue={() => setLandscapeHintVisible(false)}
      />
      {manualDialogOpen ? (
        <Dialog
          title="粘贴 Telegram initData"
          description="从 Telegram Mini App 控制台复制完整的 initData 字符串以完成登录"
          onClose={() => {
            if (!isAuthenticating) {
              setManualDialogOpen(false);
            }
          }}
          actions={[
            {
              id: 'confirm',
              label: isAuthenticating ? '登录中…' : '确认登录',
              onPress: async () => {
                if (isAuthenticating) {
                  return false;
                }
                const result = await handleManualSubmit();
                return result;
              }
            },
            {
              id: 'cancel',
              label: '取消',
              tone: 'critical',
              onPress: () => {
                if (isAuthenticating) {
                  return false;
                }
                setManualDialogOpen(false);
                return true;
              }
            }
          ]}
        >
          <textarea
            value={manualInitData}
            onChange={(event) => setManualInitData(event.target.value)}
            placeholder="query_id=...&user=...&hash=..."
            rows={6}
            style={{
              width: '100%',
              resize: 'vertical',
              padding: 12,
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              fontSize: 14,
              fontFamily: 'monospace'
            }}
            disabled={isAuthenticating}
          />
        </Dialog>
      ) : null}
    </Layout.SafeArea>
  );
}
