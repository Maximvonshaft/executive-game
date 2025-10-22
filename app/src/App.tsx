import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { Surface } from './components/Surface';
import { Text } from './components/Text';
import { Button } from './components/Button';
import { Dialog } from './components/Dialog';
import { useGlobalStore } from './state/globalStore';
import { useToast } from './providers/ToastProvider';
import { resolveTelegramInitData } from './utils/telegram';
import { useTheme } from './theme/ThemeProvider';
import { OrientationProvider, useOrientation } from './modules/device';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';
import { AppNavigation, type NavigationView } from './modules/navigation/AppNavigation';
import { LobbyView } from './modules/lobby/LobbyView';
import { LeaderboardView } from './modules/leaderboard/LeaderboardView';
import { SettingsPanel } from './modules/settings/SettingsPanel';
import { Storefront } from './modules/store/Storefront';
import { PhaserBattleStage } from './modules/battle/PhaserBattleStage';
import { GameOverlay } from './modules/battle/GameOverlay';
import type { GameDiscipline } from './modules/battle/gameConfigs';
import { avatarSprites } from './modules/assets/avatarSprites';

function BattleViewport({ discipline }: { discipline: GameDiscipline }) {
  const orientation = useOrientation();
  const ratioValue =
    orientation.aspectPreset === '19.5:9'
      ? 19.5 / 9
      : orientation.aspectPreset === 'ultraWide'
      ? orientation.ratio || 2.2
      : 16 / 9;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${ratioValue}`,
        minHeight: orientation.orientation === 'landscape' ? 520 : 420,
        background: 'radial-gradient(circle at 50% 30%, rgba(59,130,246,0.45), rgba(8,47,73,0.92))',
        borderRadius: 32,
        overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(15,23,42,0.55)'
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <PhaserBattleStage discipline={discipline} />
      </div>
      <GameOverlay discipline={discipline} />
    </div>
  );
}

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
  const { toggleContrast, isHighContrast } = useTheme();
  const toast = useToast();

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualInitData, setManualInitData] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<GameDiscipline>('texas');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<NavigationView>('lobby');

  const isInitializing = useMemo(
    () => sessionStatus === 'initializing' || isAuthenticating,
    [sessionStatus, isAuthenticating]
  );

  const activeAvatar = useMemo(
    () => (selectedAvatarId ? avatarSprites.find((item) => item.id === selectedAvatarId) : null),
    [selectedAvatarId]
  );

  const performAuthentication = useCallback(
    async (initData: string) => {
      setIsAuthenticating(true);
      try {
        await authenticateWithTelegram(initData);
        setManualInitData('');
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
    setOnboardingComplete(false);
    toast.present({
      title: '已退出登录',
      tone: 'default'
    });
  }, [clearSession, toast]);

  useEffect(() => {
    initializeSession().catch((error) => {
      toast.present({
        title: '初始化失败',
        description: error instanceof Error ? error.message : '请稍后重试',
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
    if (sessionStatus === 'authenticated' && onboardingComplete) {
      setActiveView((prev) => prev);
    }
  }, [sessionStatus, onboardingComplete]);

  const showOnboarding = !onboardingComplete;

  const renderView = () => {
    if (activeView === 'lobby') {
      return (
        <LobbyView
          selectedDiscipline={selectedDiscipline}
          onPreviewDiscipline={(discipline) => {
            setSelectedDiscipline(discipline);
            setActiveView('battle');
          }}
          onEnterBattle={(discipline) => {
            setSelectedDiscipline(discipline);
            setActiveView('battle');
          }}
        />
      );
    }
    if (activeView === 'battle') {
      return <BattleViewport discipline={selectedDiscipline} />;
    }
    if (activeView === 'leaderboard') {
      return <LeaderboardView />;
    }
    if (activeView === 'settings') {
      return <SettingsPanel />;
    }
    return <Storefront />;
  };

  return (
    <OrientationProvider>
      <Layout.SafeArea background="default">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minHeight: '100vh' }}>
          <Surface
            elevation="raised"
            radius="xl"
            padding="lg"
            gap="md"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.78))',
              border: '1px solid rgba(148,163,184,0.28)',
              boxShadow: '0 30px 90px rgba(15,23,42,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text variant="title" weight="bold">
                  Executive Game 指挥台
                </Text>
                <Text variant="caption" tone="muted">
                  会话状态：{sessionStatus === 'authenticated' ? '已登录' : sessionStatus === 'initializing' ? '登录中…' : '未登录'}
                </Text>
                {sessionError ? (
                  <Text variant="caption" tone="critical">
                    {sessionError}
                  </Text>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {activeAvatar ? (
                  <img
                    src={activeAvatar.uri}
                    alt={activeAvatar.displayName}
                    width={72}
                    height={72}
                    style={{ borderRadius: 24, border: '2px solid rgba(255,255,255,0.36)' }}
                  />
                ) : null}
                <Button
                  onClick={() => toggleContrast()}
                  variant="outline"
                  size="md"
                  accessibilityLabel="切换高对比度模式"
                >
                  高对比度：{isHighContrast ? '开启' : '关闭'}
                </Button>
                {sessionStatus === 'authenticated' ? (
                  <Button variant="outline" onClick={handleLogout} size="md">
                    退出登录
                  </Button>
                ) : null}
              </div>
            </div>
          </Surface>

          {showOnboarding ? (
            <OnboardingFlow
              sessionStatus={sessionStatus}
              sessionError={sessionError}
              isAuthenticating={isInitializing}
              onTelegramLogin={handleTelegramLogin}
              onManualLogin={() => setManualDialogOpen(true)}
              onComplete={({ avatarId, discipline }) => {
                if (sessionStatus !== 'authenticated') {
                  toast.present({
                    title: '仍需登录',
                    description: '请先完成登录流程再进入大厅。',
                    tone: 'caution'
                  });
                  setActiveView('lobby');
                  return;
                }
                setSelectedAvatarId(avatarId);
                setSelectedDiscipline(discipline);
                setOnboardingComplete(true);
                setActiveView('lobby');
                toast.present({
                  title: '欢迎回到大厅',
                  description: '首登教程已完成，可随时在设置中重新观看。',
                  tone: 'positive'
                });
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <AppNavigation active={activeView} onNavigate={setActiveView} />
              <div style={{ flex: 1 }}>{renderView()}</div>
            </div>
          )}
        </div>
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
                  if (result) {
                    setManualDialogOpen(false);
                  }
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
    </OrientationProvider>
  );
}
