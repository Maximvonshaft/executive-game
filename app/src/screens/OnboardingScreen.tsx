import { useMemo } from 'react';
import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { gameCatalog } from '../constants/gameCatalog';
import { spacingScale } from '../theme/tokens';

export type OnboardingStep = 0 | 1 | 2;

type OnboardingScreenProps = {
  step: OnboardingStep;
  sessionStatus: string;
  onTelegramLogin: () => void;
  onManualLogin: () => void;
  onGuestLogin: () => void;
  isAuthenticating: boolean;
  selectedAvatar: string | null;
  onSelectAvatar: (avatar: string) => void;
  onNext: () => void;
};

const avatarAssets = [
  'https://images.unsplash.com/photo-1487412720507-4bcfe772ebd7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529692236671-f1dc00662485?auto=format&fit=crop&w=1200&q=80'
];

export function OnboardingScreen({
  step,
  sessionStatus,
  onTelegramLogin,
  onManualLogin,
  onGuestLogin,
  isAuthenticating,
  selectedAvatar,
  onSelectAvatar,
  onNext
}: OnboardingScreenProps) {
  const stepLabel = useMemo(() => {
    switch (step) {
      case 0:
        return '1/3 登录与绑定';
      case 1:
        return '2/3 换上战斗头像';
      case 2:
        return '3/3 首局教学配置';
      default:
        return '';
    }
  }, [step]);

  return (
    <Surface padding="xl" radius="xl" elevation="raised" gap="xl" role="region" aria-label="新手引导">
      <Text variant="title" weight="bold">
        {stepLabel}
      </Text>
      {step === 0 ? (
        <StepLogin
          sessionStatus={sessionStatus}
          onTelegramLogin={onTelegramLogin}
          onManualLogin={onManualLogin}
          onGuestLogin={onGuestLogin}
          isAuthenticating={isAuthenticating}
        />
      ) : null}
      {step === 1 ? (
        <StepAvatar selectedAvatar={selectedAvatar} onSelectAvatar={onSelectAvatar} />
      ) : null}
      {step === 2 ? <StepTutorial onNext={onNext} /> : null}
      {step !== 2 ? (
        <Button variant="primary" onClick={onNext} disabled={step === 0 && sessionStatus !== 'authenticated'}>
          {step === 1 ? '确认头像并继续' : step === 0 ? '已登录，下一步' : '下一步'}
        </Button>
      ) : null}
    </Surface>
  );
}

function StepLogin({
  sessionStatus,
  onTelegramLogin,
  onManualLogin,
  onGuestLogin,
  isAuthenticating
}: {
  sessionStatus: string;
  onTelegramLogin: () => void;
  onManualLogin: () => void;
  onGuestLogin: () => void;
  isAuthenticating: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: spacingScale.md }}>
      <Text variant="body">
        支持游客登录与 Apple / Google / 微信 / 手机号一键绑定。我们默认自动检测 Telegram Mini App 的 initData。
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
        <Button onClick={onTelegramLogin} disabled={isAuthenticating}>
          {isAuthenticating ? '登录中…' : '使用 Telegram 一键登录'}
        </Button>
        <Button variant="outline" onClick={onManualLogin}>
          手动粘贴 initData
        </Button>
        <Button variant="ghost" onClick={onGuestLogin}>
          先体验游客模式
        </Button>
      </div>
      <Text variant="caption" tone="muted">
        当前状态：{sessionStatus === 'authenticated' ? '已绑定账号，可下一步' : '尚未登录'}
      </Text>
    </div>
  );
}

function StepAvatar({ selectedAvatar, onSelectAvatar }: { selectedAvatar: string | null; onSelectAvatar: (avatar: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md }}>
      <Text variant="body">
        选择头像与段位戒指，我们会在战局 HUD 中同步渲染骨骼动画与粒子特效。
      </Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: spacingScale.md }}>
        {avatarAssets.map((avatar) => {
          const selected = selectedAvatar === avatar;
          return (
            <button
              key={avatar}
              type="button"
              onClick={() => onSelectAvatar(avatar)}
              style={{
                borderRadius: 24,
                padding: 12,
                border: selected ? '2px solid rgba(109, 210, 255, 0.9)' : '2px solid transparent',
                background: selected ? 'rgba(70, 140, 255, 0.25)' : 'rgba(15, 20, 32, 0.6)',
                cursor: 'pointer'
              }}
            >
              <img src={avatar} alt="玩家头像" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 18 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTutorial({ onNext }: { onNext: () => void }) {
  const tutorials = useMemo(
    () =>
      gameCatalog.map((game) => ({
        id: game.id,
        name: game.name,
        steps: game.tutorial,
        actions: game.actions
      })),
    []
  );
  return (
    <div style={{ display: 'grid', gap: spacingScale.lg }}>
      <Text variant="body">
        每款玩法提供最低可玩教学：斗地主叫抢地主、德扑盲注节奏、象棋禁手、围棋点目等，完成后会启动 AI 托底对局。
      </Text>
      <div style={{ display: 'grid', gap: spacingScale.md }}>
        {tutorials.map((tutorial) => (
          <Surface key={tutorial.id} padding="md" radius="lg" elevation="sunken" gap="sm">
            <Text variant="body" weight="bold">
              {tutorial.name}
            </Text>
            <Text variant="caption" tone="muted">
              核心操作：{tutorial.actions.join(' · ')}
            </Text>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text)' }}>
              {tutorial.steps.map((step) => (
                <li key={step} style={{ marginBottom: 4 }}>
                  {step}
                </li>
              ))}
            </ul>
            <Button variant="outline" onClick={onNext}>
              立即预约教学
            </Button>
          </Surface>
        ))}
      </div>
    </div>
  );
}
