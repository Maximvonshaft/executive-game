import { PropsWithChildren, useEffect } from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { useToast } from './ToastProvider';
import { getRestClient } from '../state/apiClient';

function RestClientBridge({ children }: PropsWithChildren) {
  const toast = useToast();
  useEffect(() => {
    const client = getRestClient();
    const off = client.on('error', (error) => {
      toast.present({
        title: '请求失败',
        description: error.userMessage,
        tone: error.status >= 500 ? 'critical' : 'caution'
      });
    });
    return () => {
      off();
    };
  }, [toast]);
  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RestClientBridge>{children}</RestClientBridge>
      </ToastProvider>
    </ThemeProvider>
  );
}
