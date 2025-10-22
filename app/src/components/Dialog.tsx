import { PropsWithChildren } from 'react';
import { Button } from './Button';
import { Surface } from './Surface';

export type DialogAction = {
  id: string;
  label: string;
  tone?: 'primary' | 'critical';
  onPress: () => void | boolean | Promise<void | boolean>;
};

type DialogProps = PropsWithChildren<{
  title: string;
  description?: string;
  actions: DialogAction[];
  onClose: () => void;
}>;

export function Dialog({ title, description, actions, onClose, children }: DialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-backdrop)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
      }}
      onClick={onClose}
    >
      <Surface
        role="dialog"
        padding="xl"
        elevation="overlay"
        radius="lg"
        gap="lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="dialog-title" style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>
            {title}
          </h2>
          {description ? (
            <p id="dialog-description" style={{ margin: '8px 0 0 0', color: 'var(--color-textMuted)' }}>
              {description}
            </p>
          ) : null}
        </div>
        {children}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.tone === 'critical' ? 'outline' : 'primary'}
              onClick={() => {
                try {
                  const result = action.onPress();
                  if (result instanceof Promise) {
                    result
                      .then((value) => {
                        if (value !== false) {
                          onClose();
                        }
                      })
                      .catch((error) => {
                        console.error('Dialog action failed', error);
                      });
                    return;
                  }
                  if (result !== false) {
                    onClose();
                  }
                } catch (error) {
                  console.error('Dialog action threw synchronously', error);
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Surface>
    </div>
  );
}
