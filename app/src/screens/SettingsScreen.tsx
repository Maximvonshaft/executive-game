import { useState } from 'react';
import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { spacingScale } from '../theme/tokens';

export function SettingsScreen() {
  const [nickname, setNickname] = useState('战略指挥官');
  const [avatar, setAvatar] = useState('login_ring.png');
  const [region, setRegion] = useState('CN');
  const [language, setLanguage] = useState('zh-CN');
  const [vibration, setVibration] = useState(true);
  const [leftHandMode, setLeftHandMode] = useState(false);
  const [colorWeakMode, setColorWeakMode] = useState(false);
  const [highContrastHUD, setHighContrastHUD] = useState(false);
  const [maxFrameRate, setMaxFrameRate] = useState(60);
  const [bgmVolume, setBgmVolume] = useState(60);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  return (
    <div style={{ display: 'grid', gap: spacingScale.xl }}>
      <Surface padding="xl" radius="xl" elevation="raised" gap="lg">
        <Text variant="title" weight="bold">
          账号与隐私
        </Text>
        <SettingField label="昵称" description="将在牌桌与排行榜显示">
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} style={inputStyle} />
        </SettingField>
        <SettingField label="头像" description="支持 PSD / Spine 动态头像，当前为内置素材">
          <select value={avatar} onChange={(event) => setAvatar(event.target.value)} style={inputStyle}>
            <option value="login_ring.png">星环特效</option>
            <option value="swirl_ring.png">光晕旋涡</option>
            <option value="cover_ai.png">霓虹将军</option>
            <option value="cover_chess.png">棋士残影</option>
          </select>
        </SettingField>
        <SettingField label="地区" description="影响匹配分区与排行榜" inline>
          <select value={region} onChange={(event) => setRegion(event.target.value)} style={inputStyle}>
            <option value="CN">中国大陆</option>
            <option value="US">北美</option>
            <option value="EU">欧洲</option>
            <option value="SEA">东南亚</option>
          </select>
        </SettingField>
        <SettingField label="语言" description="UI 语言与语音播报">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} style={inputStyle}>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
            <option value="sq-AL">Shqip</option>
          </select>
        </SettingField>
        <SettingField label="数据权益" description="导出/删除请求符合 GDPR/CCPA" inline>
          <Button variant="outline">申请数据导出</Button>
          <Button variant="ghost">发起删除请求</Button>
        </SettingField>
      </Surface>

      <Surface padding="xl" radius="xl" elevation="raised" gap="lg">
        <Text variant="title" weight="bold">
          体验设置
        </Text>
        <ToggleField label="震动 / 触觉反馈" checked={vibration} onChange={setVibration} description="适配 iOS Taptic Engine 与 Android Haptics" />
        <ToggleField label="左手模式" checked={leftHandMode} onChange={setLeftHandMode} description="翻转 HUD 控件布局" />
        <ToggleField label="色弱模式" checked={colorWeakMode} onChange={setColorWeakMode} description="自动提升对比度并标记颜色" />
        <ToggleField label="高对比 HUD" checked={highContrastHUD} onChange={setHighContrastHUD} description="文本与关键按钮保持 ≥ 7:1 对比" />
        <SettingField label="画质 / 帧率限制" description="低端机自动降级到 L2/L3 动效" inline>
          <input
            type="number"
            min={30}
            max={120}
            value={maxFrameRate}
            onChange={(event) => setMaxFrameRate(Number.parseInt(event.target.value, 10) || 60)}
            style={inputStyle}
          />
          <span style={{ color: 'var(--color-textMuted)', fontSize: 12 }}>FPS</span>
        </SettingField>
      </Surface>

      <Surface padding="xl" radius="xl" elevation="raised" gap="lg">
        <Text variant="title" weight="bold">
          音频与语音
        </Text>
        <SliderField label="背景音乐" value={bgmVolume} onChange={setBgmVolume} />
        <SliderField label="音效" value={sfxVolume} onChange={setSfxVolume} />
        <ToggleField label="实时语音" checked={voiceEnabled} onChange={setVoiceEnabled} description="自动降噪与回声消除" />
      </Surface>
    </div>
  );
}

function SettingField({
  label,
  description,
  children,
  inline
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacingScale.sm }}>
        <Text variant="body" weight="medium">
          {label}
        </Text>
        {inline ? <div style={{ display: 'flex', gap: spacingScale.sm, alignItems: 'center' }}>{children}</div> : null}
      </div>
      {description ? (
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      ) : null}
      {!inline ? children : null}
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacingScale.sm }}>
        <Text variant="body" weight="medium">
          {label}
        </Text>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
          <span style={{ fontSize: 13, color: 'var(--color-textMuted)' }}>{checked ? '开启' : '关闭'}</span>
        </label>
      </div>
      {description ? (
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      ) : null}
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="body" weight="medium">
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {value}
        </Text>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ width: '100%' }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(20, 28, 44, 0.8)',
  border: '1px solid rgba(110, 150, 255, 0.35)',
  borderRadius: 12,
  padding: '10px 12px',
  color: 'var(--color-text)',
  fontFamily: 'inherit'
};
