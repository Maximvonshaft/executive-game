import { useEffect } from 'react';
import { useGlobalStore } from './state/globalStore';
import { useTheme } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { Surface } from './components/Surface';
import { Text } from './components/Text';
import { Button } from './components/Button';
import { useToast } from './providers/ToastProvider';

export function App() {
  const { initializeSession, sessionStatus } = useGlobalStore((state) => ({
    initializeSession: state.initializeSession,
    sessionStatus: state.session.status
  }));
  const fetchOperationalContent = useGlobalStore((state) => state.fetchOperationalContent);
  const { toggleContrast, isHighContrast } = useTheme();
  const toast = useToast();

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
    </Layout.SafeArea>
  );
}
