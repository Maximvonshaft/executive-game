import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalStore } from './state/globalStore';
import { useToast } from './providers/ToastProvider';
import { useTheme } from './theme/ThemeProvider';
import { resolveTelegramInitData } from './utils/telegram';
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow';
import { LobbyScreen, MatchMode } from './pages/lobby/LobbyScreen';
import { GameArena, GameArenaMode } from './pages/game/GameArena';
import { SettingsScreen } from './pages/settings/SettingsScreen';
import { LeaderboardScreen } from './pages/leaderboard/LeaderboardScreen';
import { StoreScreen } from './pages/store/StoreScreen';
import { Button } from './components/Button';
import { Surface } from './components/Surface';
import { Text } from './components/Text';
import { spacingScale } from './theme/tokens';

type ViewState = 'onboarding' | 'lobby' | 'game' | 'settings' | 'leaderboard' | 'store';

export function App() {
  const {
    initializeSession,
    sessionStatus,
    sessionError,
    authenticateWithTelegram,
    clearSession
  } = useGlobalStore((state) => ({
    initializeSession: state.initializeSession,
    sessionStatus: state.session.status,
    sessionError: state.session.error,
    authenticateWithTelegram: state.authenticateWithTelegram,
    clearSession: state.clearSession
  }));
  const fetchOperationalContent = useGlobalStore((state) => state.fetchOperationalContent);
  const toast = useToast();
  const { toggleContrast, isHighContrast } = useTheme();

  const [view, setView] = useState<ViewState>('onboarding');
  const [gameMode, setGameMode] = useState<GameArenaMode>('doudizhu-ranked');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isInitializing = useMemo(
    () => sessionStatus === 'initializing' || isAuthenticating,
    [sessionStatus, isAuthenticating]
  );

  const performAuthentication = useCallback(
    async (initData: string) => {
      if (!initData) {
        toast.present({
          title: '缺少 initData',
          description: '请粘贴从 Telegram Mini App 获取的 initData 字符串',
          tone: 'caution'
        });
        return false;
      }
      setIsAuthenticating(true);
      try {
        await authenticateWithTelegram(initData);
        toast.present({
          title: '登录成功',
          description: '已获取玩家身份令牌',
          tone: 'positive'
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : '登录失败，请稍后重试';
        toast.present({
          title: '登录失败',
          description: message,
          tone: 'critical'
        });
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
      return;
    }
    await performAuthentication(resolved.value);
  }, [performAuthentication, toast]);

  const handleGuestExplore = useCallback(() => {
    setView('lobby');
  }, []);

  const handleFlowCompleted = useCallback(() => {
    setHasCompletedOnboarding(true);
    setGameMode('doudizhu-ranked');
    setView('game');
  }, []);

  const handleAvatarSelected = useCallback((avatar: { imageUrl: string; frameUrl: string; name: string }) => {
    useGlobalStore.setState((draft) => {
      if (draft.player.profile) {
        draft.player.profile.identity = {
          avatarUrl: avatar.imageUrl,
          frameUrl: avatar.frameUrl,
          bannerUrl: avatar.frameUrl,
          title: avatar.name
        };
      }
    });
  }, []);

  const handleEnterMatch = useCallback((mode: MatchMode) => {
    const mapping: Record<MatchMode, GameArenaMode> = {
      'doudizhu-ranked': 'doudizhu-ranked',
      'texas-sng': 'texas-sng',
      'xiangqi-duel': 'xiangqi-duel'
    };
    setGameMode(mapping[mode]);
    setView('game');
  }, []);

  const handleExitGame = useCallback(() => {
    setView('lobby');
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setView('onboarding');
    setHasCompletedOnboarding(false);
    toast.present({
      title: '已退出登录',
      tone: 'default'
    });
  }, [clearSession, toast]);

  useEffect(() => {
    initializeSession().catch((error) => {
      toast.present({
        title: '初始化失败',
        description: error instanceof Error ? error.message : '服务暂不可用',
        tone: 'critical'
      });
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
  }, [fetchOperationalContent, toast]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (view === 'onboarding' && hasCompletedOnboarding) {
        setView('lobby');
      }
    } else if (sessionStatus === 'anonymous' && !hasCompletedOnboarding) {
      setView('onboarding');
    }
  }, [sessionStatus, view, hasCompletedOnboarding]);

  const shouldShowNavigationDock = view !== 'onboarding' && view !== 'game';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      <div className="app-holo-backdrop" />
      {view === 'onboarding' ? (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <OnboardingFlow
            sessionStatus={sessionStatus}
            sessionError={sessionError}
            onRequestTelegramLogin={handleTelegramLogin}
            onManualInitData={performAuthentication}
            onGuestExplore={handleGuestExplore}
            onFlowCompleted={handleFlowCompleted}
            onAvatarSelected={handleAvatarSelected}
            isAuthenticating={isInitializing}
          />
        </div>
      ) : null}

      {view === 'lobby' ? (
        <LobbyScreen
          onEnterMatch={handleEnterMatch}
          onOpenSettings={() => setView('settings')}
          onOpenLeaderboard={() => setView('leaderboard')}
          onOpenStore={() => setView('store')}
          onOpenBattlePass={() => toast.present({ title: '通行证', description: '即将上线赛季路线图', tone: 'caution' })}
        />
      ) : null}

      {view === 'game' ? <GameArena mode={gameMode} onExit={handleExitGame} /> : null}

      {view === 'settings' ? <SettingsScreen onClose={() => setView('lobby')} /> : null}

      {view === 'leaderboard' ? <LeaderboardScreen onClose={() => setView('lobby')} /> : null}

      {view === 'store' ? <StoreScreen onClose={() => setView('lobby')} /> : null}

      {shouldShowNavigationDock ? (
        <Surface
          padding="md"
          elevation="overlay"
          radius="lg"
          className="neon-border"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 32,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: spacingScale.md,
            background: 'rgba(5, 12, 24, 0.85)',
            borderRadius: 28,
            padding: '16px 24px',
            zIndex: 10
          }}
        >
          <Button variant={view === 'lobby' ? 'primary' : 'outline'} onClick={() => setView('lobby')}>
            大厅
          </Button>
          <Button variant={view === 'leaderboard' ? 'primary' : 'outline'} onClick={() => setView('leaderboard')}>
            排行榜
          </Button>
          <Button variant={view === 'store' ? 'primary' : 'outline'} onClick={() => setView('store')}>
            商城
          </Button>
          <Button variant="outline" onClick={() => setView('settings')}>
            设置
          </Button>
          <Button variant="outline" onClick={toggleContrast}>
            高对比 {isHighContrast ? '开' : '关'}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            退出
          </Button>
        </Surface>
      ) : null}

      {isInitializing && view !== 'onboarding' ? (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'rgba(4, 12, 24, 0.8)',
            borderRadius: 16,
            padding: '12px 20px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)'
          }}
        >
          <Text variant="caption" tone="muted">
            会话同步中…
          </Text>
        </div>
      ) : null}
    </div>
  );
}
