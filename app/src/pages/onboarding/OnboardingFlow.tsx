import { useEffect, useMemo, useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { spacingScale } from '../../theme/tokens';
import { Orientation, useOrientation } from '../../hooks/useOrientation';

export type OnboardingStep = 0 | 1 | 2;

type OnboardingFlowProps = {
  sessionStatus: 'idle' | 'initializing' | 'authenticated' | 'anonymous' | 'error';
  sessionError?: string;
  onRequestTelegramLogin: () => void;
  onManualInitData: (initData: string) => Promise<boolean>;
  onGuestExplore: () => void;
  onFlowCompleted: () => void;
  onAvatarSelected: (avatar: AvatarOption) => void;
  isAuthenticating: boolean;
};

type AvatarOption = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  frameUrl: string;
};

type TutorialCard = {
  id: string;
  title: string;
  coverUrl: string;
  summary: string;
  checkpoints: string[];
  highlight: string;
};

const avatarOptions: AvatarOption[] = [
  {
    id: 'aurora-sentinel',
    name: '极光哨兵',
    description: '擅长读牌的银河巡航员，专注于控制节奏与节拍。',
    imageUrl: 'https://cdn.pixabay.com/photo/2023/05/11/10/14/cyberpunk-7985515_1280.jpg',
    frameUrl: 'https://cdn.pixabay.com/photo/2017/07/12/18/55/frame-2492472_1280.png'
  },
  {
    id: 'nebula-strategist',
    name: '星云军师',
    description: '洞察全局、精确计算的博弈分析师，擅长识破诈唬。',
    imageUrl: 'https://cdn.pixabay.com/photo/2020/03/13/07/47/fantasy-4926874_1280.jpg',
    frameUrl: 'https://cdn.pixabay.com/photo/2017/01/31/17/44/gold-2028420_1280.png'
  },
  {
    id: 'quantum-trickster',
    name: '量子幻术师',
    description: '专精极限反应的特技玩家，以炫目演出点燃赛场。',
    imageUrl: 'https://cdn.pixabay.com/photo/2017/08/07/03/40/woman-2593366_1280.jpg',
    frameUrl: 'https://cdn.pixabay.com/photo/2014/12/03/22/22/frame-556679_1280.png'
  }
];

const tutorialCards: TutorialCard[] = [
  {
    id: 'landlord',
    title: '斗地主 - 首局教学',
    coverUrl: 'https://cdn.pixabay.com/photo/2017/06/21/00/29/poker-2426866_1280.jpg',
    summary: '掌握叫/抢地主的优先级策略，并学会在首回合压制对手节奏。',
    checkpoints: ['读懂首轮叫分', '抢地主与加倍策略', '手牌排序与出牌节奏'],
    highlight: '重点演示：三步识别炸弹牌型，进入 Time Bank 自动补时机制。'
  },
  {
    id: 'texas',
    title: '德州扑克 - 盲注与加注',
    coverUrl: 'https://cdn.pixabay.com/photo/2016/11/21/15/46/poker-1843432_1280.jpg',
    summary: '演示小盲 / 大盲位置、翻牌前策略与 Time Bank 加时。',
    checkpoints: ['盲注节奏与筹码池计算', '自动跟注/弃牌设置', '边池分配与胜率提示'],
    highlight: '重点演示：All-in 叙事动效触发，动态景深 + 粒子火花强化临场感。'
  },
  {
    id: 'xiangqi',
    title: '象棋 - 基本开局',
    coverUrl: 'https://cdn.pixabay.com/photo/2017/01/11/11/47/chinese-chess-1973727_1280.jpg',
    summary: '学习中炮、屏风马等经典开局，掌握禁手与补时规则。',
    checkpoints: ['落子高亮与禁手提示', '悔棋与战局回放', '连胜加成与段位积分'],
    highlight: '重点演示：将军动画的粒子光束与棋盘景深过渡，兼容色弱模式。'
  }
];

const stepLabels: Record<OnboardingStep, string> = {
  0: '登录验证',
  1: '个性设定',
  2: '首局教学'
};

const safeAreaPadding = `calc(${spacingScale.lg}px + var(--safe-area-bottom))`;

export function OnboardingFlow({
  sessionStatus,
  sessionError,
  onRequestTelegramLogin,
  onManualInitData,
  onGuestExplore,
  onFlowCompleted,
  onAvatarSelected,
  isAuthenticating
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualInitData, setManualInitData] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const orientation = useOrientation();

  useEffect(() => {
    if (sessionStatus === 'authenticated' && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [sessionStatus, currentStep]);

  useEffect(() => {
    if (selectedAvatar) {
      onAvatarSelected(selectedAvatar);
    }
  }, [selectedAvatar, onAvatarSelected]);

  const canContinue = useMemo(() => {
    if (currentStep === 0) {
      return sessionStatus === 'authenticated';
    }
    if (currentStep === 1) {
      return Boolean(selectedAvatar);
    }
    return true;
  }, [currentStep, sessionStatus, selectedAvatar]);

  const handleNext = async () => {
    if (currentStep === 0 && sessionStatus !== 'authenticated') {
      onRequestTelegramLogin();
      return;
    }
    if (currentStep < 2) {
      setCurrentStep((prev) => ((prev + 1) as OnboardingStep));
      return;
    }
    onFlowCompleted();
  };

  const renderStepContent = (step: OnboardingStep, orientationValue: Orientation) => {
    if (step === 0) {
      return (
        <Surface padding="lg" gap="lg" elevation="raised" className="neon-border" role="region">
          <Text variant="title" weight="bold">欢迎来到 Executive Game</Text>
          <Text variant="body" tone="muted">
            三步完成首登引导：登录账号 → 选择形象 → 体验首局教学。支持游客体验、Apple / Google / 微信 / 手机号绑定。
          </Text>
          <div
            style={{
              display: 'grid',
              gap: spacingScale.md,
              gridTemplateColumns: orientationValue === 'portrait' ? '1fr' : '1fr 1fr'
            }}
          >
            <div
              style={{
                backgroundImage:
                  'url(https://cdn.pixabay.com/photo/2021/07/27/08/34/digital-6497813_1280.jpg)',
                backgroundSize: 'cover',
                borderRadius: 24,
                padding: 'min(5vw, 24px)',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(160deg, rgba(6, 15, 33, 0.2) 0%, rgba(6, 15, 33, 0.85) 90%)'
                }}
              />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Text variant="subtitle" weight="bold">
                  Telegram 一键登录
                </Text>
                <Button onClick={onRequestTelegramLogin} disabled={isAuthenticating}>
                  {isAuthenticating ? '认证中…' : '调用 Telegram 登录' }
                </Button>
                <Button variant="ghost" onClick={() => setManualDialogOpen(true)} disabled={isAuthenticating}>
                  粘贴 initData 完成校验
                </Button>
              </div>
            </div>
            <Surface padding="md" elevation="sunken" radius="lg" style={{ backdropFilter: 'var(--hud-blur)' }}>
              <Text variant="body" weight="medium">
                新手托底 & 教学关
              </Text>
              <ul style={{ margin: 0, paddingInlineStart: '1.2em', color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                <li>排位外提供智能 Bot，避免低并发排队超时</li>
                <li>自动解锁斗地主、德扑、象棋教学关，覆盖基础规则</li>
                <li>断线重连：心跳 + 状态快照即时恢复</li>
              </ul>
              {sessionError ? (
                <Text variant="caption" tone="critical">
                  {sessionError}
                </Text>
              ) : null}
            </Surface>
          </div>
        </Surface>
      );
    }

    if (step === 1) {
      return (
        <Surface padding="lg" gap="lg" elevation="raised" className="neon-border" role="region">
          <Text variant="title" weight="bold">挑选你的身份徽章</Text>
          <Text variant="body" tone="muted">
            头像、边框与称号将同步至大厅、对局、排行榜、战队等所有露出位。不同形象解锁独特入场动画与 HUD 主题色。
          </Text>
          <div
            style={{
              display: 'grid',
              gap: spacingScale.lg,
              gridTemplateColumns: orientationValue === 'portrait' ? '1fr' : 'repeat(3, minmax(0, 1fr))'
            }}
          >
            {avatarOptions.map((option) => {
              const isActive = selectedAvatar?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className="neon-border"
                  onClick={() => setSelectedAvatar(option)}
                  style={{
                    border: 'none',
                    background: 'rgba(18, 28, 48, 0.75)',
                    borderRadius: 20,
                    padding: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    outline: isActive ? '2px solid rgba(100, 255, 218, 0.9)' : '1px solid rgba(255,255,255,0.15)',
                    transition: 'transform 260ms ease, outline 260ms ease',
                    transform: isActive ? 'translateY(-4px)' : 'translateY(0)'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '16 / 9',
                      backgroundImage: `linear-gradient(180deg, rgba(3, 10, 24, 0) 0%, rgba(3, 10, 24, 0.9) 85%), url(${option.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      animation: 'cardFloat 8s ease-in-out infinite'
                    }}
                  >
                    <img
                      src={option.frameUrl}
                      alt={`${option.name} 边框`}
                      style={{
                        position: 'absolute',
                        inset: '8% 6%',
                        width: '88%',
                        height: '84%',
                        objectFit: 'contain',
                        mixBlendMode: 'screen',
                        opacity: 0.8,
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: isActive
                          ? 'linear-gradient(120deg, rgba(100,255,218,0.25) 0%, rgba(125,89,255,0.25) 100%)'
                          : 'transparent'
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <Text variant="subtitle" weight="bold">{option.name}</Text>
                      <Text variant="caption" tone="muted">
                        {option.description}
                      </Text>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Surface>
      );
    }

    return (
      <Surface padding="lg" gap="lg" elevation="raised" className="neon-border" role="region">
        <Text variant="title" weight="bold">最低可玩教学关</Text>
        <Text variant="body" tone="muted">
          根据不同玩法生成定制化教程：斗地主叫 / 抢地主，德扑盲注 / 跟 / 加注，象棋基本落子与禁手规则。支持可回放的关键事件 Bookmark。
        </Text>
        <div
          style={{
            display: 'grid',
            gap: spacingScale.lg,
            gridTemplateColumns: orientationValue === 'portrait' ? '1fr' : 'repeat(3, minmax(0, 1fr))'
          }}
        >
          {tutorialCards.map((card) => (
            <Surface
              key={card.id}
              padding="md"
              gap="md"
              elevation="raised"
              radius="lg"
              className="neon-border"
              style={{
                backgroundImage: `linear-gradient(170deg, rgba(6, 14, 29, 0.6), rgba(6, 14, 29, 0.95)), url(${card.coverUrl})`,
                backgroundSize: 'cover',
                minHeight: 320,
                justifyContent: 'space-between',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.1), transparent 55%)',
                  mixBlendMode: 'screen',
                  pointerEvents: 'none'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
                <Text variant="subtitle" weight="bold">{card.title}</Text>
                <Text variant="body" tone="muted">
                  {card.summary}
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
                <Text variant="caption" weight="medium" tone="muted">
                  关键检查点
                </Text>
                <ul style={{ margin: 0, paddingInlineStart: '1.2em', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
                  {card.checkpoints.map((checkpoint) => (
                    <li key={checkpoint}>{checkpoint}</li>
                  ))}
                </ul>
                <Text variant="caption" tone="positive">
                  {card.highlight}
                </Text>
              </div>
            </Surface>
          ))}
        </div>
      </Surface>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: spacingScale.lg,
        paddingBottom: safeAreaPadding
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md }}>
        <Text variant="caption" tone="muted">
          首登流程
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacingScale.md }}>
          {(Object.keys(stepLabels) as Array<keyof typeof stepLabels>).map((stepIndex) => {
            const stepValue = Number(stepIndex) as OnboardingStep;
            const isCompleted = currentStep > stepValue || (stepValue === 0 && sessionStatus === 'authenticated');
            const isActive = currentStep === stepValue;
            return (
              <div key={stepIndex} style={{ display: 'flex', alignItems: 'center', gap: spacingScale.sm }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isCompleted
                      ? 'linear-gradient(135deg, rgba(100,255,218,0.8), rgba(61, 90, 254, 0.8))'
                      : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '0 0 0 6px rgba(100,255,218,0.2)' : undefined,
                    transition: 'all 240ms ease'
                  }}
                >
                  <Text variant="caption" weight="bold">
                    {stepValue + 1}
                  </Text>
                </div>
                <Text variant="body" tone={isActive ? 'default' : 'muted'}>
                  {stepLabels[stepValue]}
                </Text>
                {stepValue !== 2 ? (
                  <div
                    style={{
                      width: 56,
                      height: 2,
                      background: isCompleted ? 'rgba(100,255,218,0.8)' : 'rgba(255,255,255,0.12)',
                      transition: 'background 240ms ease'
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {renderStepContent(currentStep, orientation)}
      <div
        style={{
          display: 'flex',
          gap: spacingScale.md,
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}
      >
        <Button
          variant="ghost"
          onClick={onGuestExplore}
          style={{ flex: '1 1 200px', minWidth: 200 }}
        >
          游客先逛逛
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canContinue && currentStep !== 0}
          style={{ flex: '1 1 240px', minWidth: 240 }}
        >
          {currentStep < 2 ? '下一步' : '立即开局体验'}
        </Button>
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
              label: isAuthenticating ? '校验中…' : '确认登录',
              onPress: async () => {
                if (isAuthenticating) {
                  return false;
                }
                const success = await onManualInitData(manualInitData.trim());
                if (success) {
                  setManualInitData('');
                  setManualDialogOpen(false);
                }
                return success;
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
            rows={6}
            value={manualInitData}
            onChange={(event) => setManualInitData(event.target.value)}
            placeholder="query_id=...&user=...&hash=..."
            style={{
              width: '100%',
              resize: 'vertical',
              padding: 12,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(9, 16, 32, 0.9)',
              color: 'inherit',
              fontSize: 14,
              fontFamily: 'monospace'
            }}
            disabled={isAuthenticating}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
