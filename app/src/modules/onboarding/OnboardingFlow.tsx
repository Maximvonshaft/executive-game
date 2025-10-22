import { useEffect, useMemo, useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { avatarSprites } from '../assets/avatarSprites';
import { assetPipeline } from '../assets/pipeline';
import { getHUDConfig, type GameDiscipline } from '../battle/gameConfigs';

export type OnboardingStep = 'login' | 'avatar' | 'tutorial';

interface OnboardingFlowProps {
  sessionStatus: 'idle' | 'initializing' | 'authenticated' | 'error' | 'anonymous';
  sessionError?: string | null;
  isAuthenticating: boolean;
  onTelegramLogin: () => void;
  onManualLogin: () => void;
  onComplete: (payload: { avatarId: string; discipline: GameDiscipline }) => void;
}

const disciplines: { id: GameDiscipline; title: string; description: string }[] = [
  {
    id: 'texas',
    title: '量子德扑试炼',
    description: '学习盲注、Time Bank 与边池拆分，适合喜爱竞技的玩家。'
  },
  {
    id: 'doudizhu',
    title: '极光斗地主引导',
    description: '掌握叫/抢地主、炸弹与春天判定，体验热血三人对抗。'
  },
  {
    id: 'xiangqi',
    title: '玉麟象棋教学',
    description: '聚焦九宫、河界与禁着点规则，适合策略控与棋类玩家。'
  }
];

export function OnboardingFlow({ sessionStatus, sessionError, isAuthenticating, onTelegramLogin, onManualLogin, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('login');
  const [avatarId, setAvatarId] = useState<string>(avatarSprites[0].id);
  const [discipline, setDiscipline] = useState<GameDiscipline>('texas');

  useEffect(() => {
    if (sessionStatus === 'authenticated' && step === 'login') {
      setStep('avatar');
    }
  }, [sessionStatus, step]);

  const themePalette = useMemo(() => {
    const theme = assetPipeline.artBible.themes.find((item) => item.id === 'aurora-casino');
    return theme?.palette ?? ['#0f172a', '#1e3a8a', '#38bdf8', '#fef08a'];
  }, []);

  return (
    <Surface
      elevation="raised"
      radius="xl"
      padding="lg"
      gap="lg"
      style={{
        width: '100%',
        maxWidth: 960,
        margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,64,175,0.78))',
        border: '1px solid rgba(148,163,184,0.24)',
        boxShadow: '0 40px 120px rgba(15,23,42,0.55)'
      }}
    >
      <Text variant="title" weight="bold">
        首登引导 · 三步即可开局
      </Text>
      {step === 'login' ? (
        <Surface elevation="sunken" radius="lg" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.72)' }}>
          <Text variant="body" weight="bold">
            第一步：登录账号
          </Text>
          <Text variant="caption" tone="muted">
            支持游客登录与 Telegram 一键授权。正式赛季前建议完成绑定，确保赛季积分与资产安全。
          </Text>
          {sessionError ? (
            <Text variant="caption" tone="critical">
              {sessionError}
            </Text>
          ) : null}
          <div style={{ display: 'flex', gap: 16 }}>
            <Button onClick={onTelegramLogin} disabled={isAuthenticating} size="lg">
              {isAuthenticating ? '登录中…' : '使用 Telegram 登录'}
            </Button>
            <Button variant="outline" onClick={onManualLogin} disabled={isAuthenticating} size="lg">
              手动粘贴 initData
            </Button>
          </div>
          <Surface elevation="sunken" radius="md" padding="md" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Text variant="caption" tone="muted">
              绑定完成后即可同步战队、好友榜与跨端数据。
            </Text>
          </Surface>
        </Surface>
      ) : null}

      {step === 'avatar' ? (
        <Surface elevation="sunken" radius="lg" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
          <Text variant="body" weight="bold">
            第二步：选择你的赛季形象
          </Text>
          <Text variant="caption" tone="muted">
            头像与主题将决定大厅动画的主色调，并影响段位晋升演出。
          </Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 24
            }}
          >
            {avatarSprites.map((avatar) => {
              const isActive = avatar.id === avatarId;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  style={{
                    border: isActive ? '2px solid rgba(56,189,248,0.95)' : '2px solid transparent',
                    borderRadius: 24,
                    padding: 16,
                    background: `linear-gradient(135deg, ${themePalette[0]}, ${themePalette[2]})`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 20px 40px rgba(56,189,248,0.45)' : '0 12px 24px rgba(15,23,42,0.45)',
                    transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img
                    src={avatar.uri}
                    alt={avatar.displayName}
                    width={160}
                    height={160}
                    style={{ borderRadius: 16, border: '2px solid rgba(255,255,255,0.42)' }}
                  />
                  <Text variant="body" weight="bold">
                    {avatar.displayName}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {avatar.lore}
                  </Text>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="lg" onClick={() => setStep('tutorial')}>
              下一步：开启首局教学
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 'tutorial' ? (
        <Surface elevation="sunken" radius="lg" padding="lg" gap="lg" style={{ background: 'rgba(15,23,42,0.68)' }}>
          <Text variant="body" weight="bold">
            第三步：首局教学 & Lottie 动画概览
          </Text>
          <Text variant="caption" tone="muted">
            根据玩法生成最低可玩教程，自动匹配对应 HUD 布局与动画等级。
          </Text>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {disciplines.map((item) => {
              const active = item.id === discipline;
              const config = getHUDConfig(item.id);
              return (
                <Surface
                  key={item.id}
                  elevation={active ? 'raised' : 'sunken'}
                  radius="lg"
                  padding="md"
                  gap="sm"
                  style={{
                    width: 280,
                    border: active ? '1px solid rgba(59,130,246,0.8)' : '1px solid rgba(148,163,184,0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setDiscipline(item.id)}
                >
                  <Text variant="body" weight="bold">
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {item.description}
                  </Text>
                  <Text variant="caption" tone="muted">
                    教程聚焦：{config.tutorial.focusSteps.join(' / ')}
                  </Text>
                  <Surface elevation="sunken" radius="md" padding="sm" style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <Text variant="caption" tone="muted">
                      Lottie 动画：{config.tutorial.lottieAnimation}
                    </Text>
                  </Surface>
                </Surface>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">
              动画等级建议：{assetPipeline.animationTiers.map((tier) => `${tier.level}`).join(' → ')}
            </Text>
            <Button
              size="lg"
              onClick={() => onComplete({ avatarId, discipline })}
            >
              完成引导，进入大厅
            </Button>
          </div>
        </Surface>
      ) : null}
    </Surface>
  );
}
