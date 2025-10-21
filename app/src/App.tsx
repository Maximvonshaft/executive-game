import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalStore } from './state/globalStore';
import { useTheme } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { Surface } from './components/Surface';
import { Text } from './components/Text';
import { Button } from './components/Button';
import { useToast } from './providers/ToastProvider';
import { Dialog } from './components/Dialog';
import { resolveTelegramInitData } from './utils/telegram';

export function App() {
  const { initializeSession, sessionStatus, sessionError, authenticateWithTelegram, sessionUser, clearSession } =
    useGlobalStore((state) => ({
      initializeSession: state.initializeSession,
      sessionStatus: state.session.status,
      sessionError: state.session.error,
      authenticateWithTelegram: state.authenticateWithTelegram,
      sessionUser: state.session.user,
      clearSession: state.clearSession
    }));
  const fetchOperationalContent = useGlobalStore((state) => state.fetchOperationalContent);
  const { toggleContrast, isHighContrast } = useTheme();
  const toast = useToast();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualInitData, setManualInitData] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isInitializing = useMemo(() => sessionStatus === 'initializing' || isAuthenticating, [sessionStatus, isAuthenticating]);

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
    toast.present({
      title: '已退出登录',
      tone: 'default'
    });
  }, [clearSession, toast]);

  useEffect(() => {
    initializeSession().catch((error) => {
      toast.present({
        title: '初始化失败',
        description: error.message,
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

  return (
    <Layout.SafeArea>
      <Layout.Screen>
        <Surface padding="lg" gap="lg">
          <Text variant="title" weight="bold">
            Executive Game 控制台
          </Text>
          <Text variant="body" tone="muted">
            会话状态：{sessionStatus === 'authenticated' ? '已登录' : '未登录'}
          </Text>
          {sessionStatus === 'authenticated' && sessionUser ? (
            <Surface padding="md" gap="sm" elevation="raised" radius="md">
              <Text variant="body" weight="medium">
                {sessionUser.firstName} {sessionUser.lastName}
              </Text>
              {sessionUser.username ? (
                <Text variant="caption" tone="muted">
                  @{sessionUser.username}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted">
                用户 ID：{sessionUser.id}
              </Text>
              <Text variant="caption" tone="muted">
                语言：{sessionUser.languageCode || '未知'}
              </Text>
              <Button variant="outline" onClick={handleLogout}>
                退出登录
              </Button>
            </Surface>
          ) : (
            <Surface padding="md" gap="md" elevation="sunken" radius="md">
              <Text variant="body" tone="muted">
                登录后即可访问玩家资料、匹配与实时对战功能。
              </Text>
              {sessionError ? (
                <Text variant="caption" tone="critical">
                  {sessionError}
                </Text>
              ) : null}
              <Button onClick={handleTelegramLogin} disabled={isInitializing}>
                {isInitializing ? '登录中…' : '使用 Telegram 登录'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setManualDialogOpen(true)}
                disabled={isInitializing}
              >
                手动粘贴 initData
              </Button>
            </Surface>
          )}
          <Button
            onClick={() => toggleContrast()}
            variant="outline"
            size="md"
            accessibilityLabel="切换高对比度模式"
          >
            切换高对比度（当前：{isHighContrast ? '开启' : '关闭'}）
          </Button>
        </Surface>
      </Layout.Screen>
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
