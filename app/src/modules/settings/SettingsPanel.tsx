import { useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';

export function SettingsPanel() {
  const [leftHandMode, setLeftHandMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [colorBlind, setColorBlind] = useState<'normal' | 'protanopia' | 'deuteranopia'>('normal');
  const [language, setLanguage] = useState<'zh' | 'en' | 'sq'>('zh');

  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="title" weight="bold">
          账号与隐私
        </Text>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.58)' }}>
          <Text variant="body" weight="bold">
            昵称与头像
          </Text>
          <Text variant="caption" tone="muted">
            在战队与排行榜中展示的形象，可随赛季主题切换。
          </Text>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button>修改昵称</Button>
            <Button variant="outline">更换头像</Button>
          </div>
        </Surface>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.58)' }}>
          <Text variant="body" weight="bold">
            隐私管理
          </Text>
          <Text variant="caption" tone="muted">
            支持拉黑、数据导出、删除请求；符合 GDPR / CCPA 要求。
          </Text>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="outline">查看拉黑列表</Button>
            <Button variant="outline">导出数据</Button>
            <Button variant="danger">提交删除请求</Button>
          </div>
        </Surface>
      </Surface>

      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="title" weight="bold">
          体验与可达性
        </Text>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
          <Text variant="body" weight="bold">
            图像设置
          </Text>
          <Text variant="caption" tone="muted">
            自定义画质/帧率、特效强度，低端机自动降级至 L2/L3 动画。
          </Text>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="outline">画质：高</Button>
            <Button variant="outline">帧率：60fps</Button>
            <Button variant="outline">特效：全开</Button>
          </div>
        </Surface>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
          <Text variant="body" weight="bold">
            操作模式
          </Text>
          <Text variant="caption" tone="muted">
            左手模式与安全区缩放，保证“双拇指绿区”触达。
          </Text>
          <Button variant={leftHandMode ? 'primary' : 'outline'} onClick={() => setLeftHandMode((prev) => !prev)}>
            左手模式：{leftHandMode ? '开启' : '关闭'}
          </Button>
        </Surface>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
          <Text variant="body" weight="bold">
            无障碍增强
          </Text>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant={highContrast ? 'primary' : 'outline'} onClick={() => setHighContrast((prev) => !prev)}>
              高对比度：{highContrast ? '开启' : '关闭'}
            </Button>
            <Button variant="outline" onClick={() => setColorBlind('protanopia')}>
              色弱模式：原谅绿
            </Button>
            <Button variant="outline" onClick={() => setColorBlind('deuteranopia')}>
              色弱模式：湖蓝
            </Button>
            <Text variant="caption" tone="muted">
              当前模式：{colorBlind}
            </Text>
          </div>
        </Surface>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
          <Text variant="body" weight="bold">
            多语言 / 地区服务器
          </Text>
          <Text variant="caption" tone="muted">
            切换后需要重新连接匹配服务器，推荐赛季开始前完成。
          </Text>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant={language === 'zh' ? 'primary' : 'outline'} onClick={() => setLanguage('zh')}>
              中文
            </Button>
            <Button variant={language === 'en' ? 'primary' : 'outline'} onClick={() => setLanguage('en')}>
              English
            </Button>
            <Button variant={language === 'sq' ? 'primary' : 'outline'} onClick={() => setLanguage('sq')}>
              Shqip
            </Button>
          </div>
        </Surface>
      </Surface>

      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="title" weight="bold">
          音频与语音
        </Text>
        <Surface elevation="sunken" radius="md" padding="md" gap="sm" style={{ background: 'rgba(30,41,59,0.52)' }}>
          <Text variant="body" weight="bold">
            音轨控制
          </Text>
          <Text variant="caption" tone="muted">
            分轨控制 BGM、音效、语音；支持自动降噪与回声消除。
          </Text>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="outline">BGM：70%</Button>
            <Button variant="outline">SFX：80%</Button>
            <Button variant="outline">语音：开启</Button>
            <Button variant="outline">降噪：自动</Button>
          </div>
        </Surface>
      </Surface>
    </div>
  );
}
