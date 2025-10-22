import { ChangeEvent, useMemo, useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { useOrientation } from '../../hooks/useOrientation';
import { spacingScale } from '../../theme/tokens';
import { useToast } from '../../providers/ToastProvider';
import { useGlobalStore } from '../../state/globalStore';

type SettingsScreenProps = {
  onClose: () => void;
};

type ExperienceSettings = {
  graphics: 'low' | 'medium' | 'high';
  fps: 30 | 60 | 90;
  effectIntensity: 'low' | 'medium' | 'high';
  vibration: boolean;
  leftHandMode: boolean;
  colorblindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontScale: 'default' | 'large' | 'extra';
  language: string;
};

type AudioSettings = {
  bgm: number;
  sfx: number;
  voice: number;
  noiseCancel: boolean;
};

const avatarBackground = 'https://cdn.pixabay.com/photo/2016/11/29/04/09/abstract-1868156_1280.jpg';

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const orientation = useOrientation();
  const toast = useToast();
  const profile = useGlobalStore((state) => state.player.profile);
  const [nickname, setNickname] = useState(profile?.identity?.title ?? '星耀旅者');
  const [region, setRegion] = useState('中国大陆');
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.identity?.avatarUrl ?? 'https://cdn.pixabay.com/photo/2016/11/29/09/08/woman-1868772_1280.jpg'
  );
  const [experience, setExperience] = useState<ExperienceSettings>({
    graphics: 'high',
    fps: 60,
    effectIntensity: 'high',
    vibration: true,
    leftHandMode: false,
    colorblindMode: 'off',
    fontScale: 'default',
    language: 'zh-CN'
  });
  const [audio, setAudio] = useState<AudioSettings>({ bgm: 60, sfx: 74, voice: 68, noiseCancel: true });
  const [blockedList] = useState(['ID: 382910273', 'ID: 398817261']);

  const handleExperienceChange = (key: keyof ExperienceSettings, value: ExperienceSettings[keyof ExperienceSettings]) => {
    setExperience((prev) => ({ ...prev, [key]: value }));
  };

  const handleAudioChange = (key: keyof AudioSettings) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = key === 'noiseCancel' ? event.target.checked : Number(event.target.value);
    setAudio((prev) => ({ ...prev, [key]: value as never }));
  };

  const orientationLayout = useMemo(
    () => ({ columns: orientation === 'portrait' ? 1 : 2, layout: orientation === 'portrait' ? 'column' : 'row' }),
    [orientation]
  );

  const handleSave = () => {
    toast.present({
      title: '设置已保存',
      description: '你的偏好已同步至云端，低端设备会自动降级动效。',
      tone: 'positive'
    });
    onClose();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacingScale.lg,
        padding: `${spacingScale.lg + insets.top}px ${spacingScale.lg + insets.right}px ${spacingScale.lg + insets.bottom}px ${spacingScale.lg + insets.left}px`,
        minHeight: '100vh'
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headline" weight="bold">
          设置中心
        </Text>
        <Button variant="outline" onClick={onClose}>
          返回
        </Button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${orientationLayout.columns}, minmax(0, 1fr))`,
          gap: spacingScale.lg
        }}
      >
        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">
            账号与隐私
          </Text>
          <div
            style={{
              display: 'grid',
              gap: spacingScale.md,
              gridTemplateColumns: orientation === 'portrait' ? '1fr' : '180px 1fr'
            }}
          >
            <div
              style={{
                borderRadius: 24,
                backgroundImage: `linear-gradient(160deg, rgba(6,14,33,0.65), rgba(6,14,33,0.9)), url(${avatarBackground})`,
                backgroundSize: 'cover',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacingScale.sm
              }}
            >
              <img
                src={avatarUrl}
                alt="当前头像"
                style={{ width: 96, height: 96, borderRadius: 28, objectFit: 'cover', boxShadow: '0 16px 32px rgba(0,0,0,0.45)' }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAvatarUrl('https://cdn.pixabay.com/photo/2016/03/27/07/08/fashion-1283863_1280.jpg')
                }
              >
                更换形象
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text variant="caption" tone="muted">
                  昵称
                </Text>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(10,18,34,0.85)',
                    color: 'inherit'
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text variant="caption" tone="muted">
                  地区
                </Text>
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(10,18,34,0.85)',
                    color: 'inherit'
                  }}
                >
                  <option value="中国大陆">中国大陆</option>
                  <option value="香港">香港</option>
                  <option value="台湾">台湾</option>
                  <option value="新加坡">新加坡</option>
                  <option value="阿尔巴尼亚">阿尔巴尼亚</option>
                </select>
              </label>
              <Surface padding="md" elevation="sunken" radius="lg" style={{ gap: 8 }}>
                <Text variant="caption" tone="muted">
                  拉黑列表
                </Text>
                {blockedList.map((id) => (
                  <Text key={id} variant="caption" tone="muted">
                    {id}
                  </Text>
                ))}
              </Surface>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacingScale.sm, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm">
              绑定 Apple ID
            </Button>
            <Button variant="outline" size="sm">
              绑定 Google
            </Button>
            <Button variant="outline" size="sm">
              数据导出 / 删除
            </Button>
          </div>
        </Surface>

        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">
            体验调节
          </Text>
          <div style={{ display: 'grid', gap: spacingScale.md, gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <Text variant="caption" tone="muted">
                画质
              </Text>
              <div style={{ display: 'flex', gap: spacingScale.sm }}>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={experience.graphics === level ? 'primary' : 'outline'}
                    onClick={() => handleExperienceChange('graphics', level)}
                  >
                    {level === 'low' ? '低' : level === 'medium' ? '中' : '高'}
                  </Button>
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <Text variant="caption" tone="muted">
                帧率限制
              </Text>
              <select
                value={experience.fps}
                onChange={(event) => handleExperienceChange('fps', Number(event.target.value) as ExperienceSettings['fps'])}
                style={{
                  padding: '12px 16px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(10,18,34,0.85)',
                  color: 'inherit'
                }}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
                <option value={90}>90 FPS</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <Text variant="caption" tone="muted">
                特效强度
              </Text>
              <input
                type="range"
                min={0}
                max={2}
                value={experience.effectIntensity === 'low' ? 0 : experience.effectIntensity === 'medium' ? 1 : 2}
                onChange={(event) =>
                  handleExperienceChange(
                    'effectIntensity',
                    Number(event.target.value) === 0 ? 'low' : Number(event.target.value) === 1 ? 'medium' : 'high'
                  )
                }
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={experience.vibration}
                  onChange={(event) => handleExperienceChange('vibration', event.target.checked)}
                />
                震动 / 触觉反馈
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={experience.leftHandMode}
                  onChange={(event) => handleExperienceChange('leftHandMode', event.target.checked)}
                />
                左手模式
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.xs }}>
                <Text variant="caption" tone="muted">
                  色弱模式
                </Text>
                <select
                  value={experience.colorblindMode}
                  onChange={(event) =>
                    handleExperienceChange('colorblindMode', event.target.value as ExperienceSettings['colorblindMode'])
                  }
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(10,18,34,0.85)',
                    color: 'inherit'
                  }}
                >
                  <option value="off">关闭</option>
                  <option value="protanopia">红色弱</option>
                  <option value="deuteranopia">绿色弱</option>
                  <option value="tritanopia">蓝色弱</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.xs }}>
                <Text variant="caption" tone="muted">
                  字号
                </Text>
                <select
                  value={experience.fontScale}
                  onChange={(event) => handleExperienceChange('fontScale', event.target.value as ExperienceSettings['fontScale'])}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(10,18,34,0.85)',
                    color: 'inherit'
                  }}
                >
                  <option value="default">默认</option>
                  <option value="large">较大</option>
                  <option value="extra">特大</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.xs }}>
                <Text variant="caption" tone="muted">
                  语言
                </Text>
                <select
                  value={experience.language}
                  onChange={(event) => handleExperienceChange('language', event.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(10,18,34,0.85)',
                    color: 'inherit'
                  }}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                  <option value="sq-AL">Shqip</option>
                </select>
              </label>
            </div>
          </div>
        </Surface>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: spacingScale.lg
        }}
      >
        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">
            音频
          </Text>
          <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
            <Text variant="caption" tone="muted">
              背景音乐
            </Text>
            <input type="range" min={0} max={100} value={audio.bgm} onChange={handleAudioChange('bgm')} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
            <Text variant="caption" tone="muted">
              音效
            </Text>
            <input type="range" min={0} max={100} value={audio.sfx} onChange={handleAudioChange('sfx')} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm }}>
            <Text variant="caption" tone="muted">
              语音
            </Text>
            <input type="range" min={0} max={100} value={audio.voice} onChange={handleAudioChange('voice')} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacingScale.sm }}>
            <input type="checkbox" checked={audio.noiseCancel} onChange={handleAudioChange('noiseCancel')} /> 自动降噪 / 回声消除
          </label>
        </Surface>

        <Surface
          padding="lg"
          elevation="raised"
          radius="lg"
          className="neon-border"
          style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
        >
          <Text variant="subtitle" weight="bold">
            安全与合规
          </Text>
          <Text variant="caption" tone="muted">
            平台严格执行反赌博与隐私政策，筹码与现金完全隔离。
          </Text>
          <Button variant="outline" size="sm">
            家长监护
          </Button>
          <Button variant="outline" size="sm">
            年龄分级说明
          </Button>
          <Button variant="outline" size="sm">
            隐私政策
          </Button>
        </Surface>
      </section>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: spacingScale.md }}>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>保存设置</Button>
      </footer>
    </div>
  );
}
