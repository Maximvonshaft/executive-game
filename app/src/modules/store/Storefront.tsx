import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';

const passRewards = [
  { tier: 'Free 01', reward: '霓虹表情包', requirement: '登录 3 天' },
  { tier: 'Premium 05', reward: '德扑发牌 L3 动画', requirement: '完成 10 场排位' },
  { tier: 'Premium 10', reward: '象棋胜利演出 L4', requirement: '段位达到 星耀 · III' }
];

const bundles = [
  { id: 'starter', title: '新手跃迁包', contents: ['头像背景 ×2', 'Time Bank +10s'], price: '¥38' },
  { id: 'season', title: '赛季通行证', contents: ['赛季任务', '限定入场特效', '奖励加成'], price: '¥88' },
  { id: 'fx', title: '动画工作坊', contents: ['Lottie UI 动画', 'Phaser 粒子材质'], price: '¥128' }
];

const currencies = [
  { id: 'chips', name: '训练筹码', description: '用于德扑训练场与活动兑换，完全隔离现金。' },
  { id: 'tickets', name: '赛事门票', description: '报名赛季锦标赛，可通过活动获取。' },
  { id: 'tokens', name: '星辉代币', description: '用于购买高阶特效与赛季限定外观。' }
];

export function Storefront() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.72)' }}>
        <Text variant="title" weight="bold">
          赛季通行证
        </Text>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {passRewards.map((reward) => (
            <Surface key={reward.tier} elevation="sunken" radius="lg" padding="md" style={{ width: 240 }}>
              <Text variant="body" weight="bold">
                {reward.tier}
              </Text>
              <Text variant="caption" tone="muted">
                奖励：{reward.reward}
              </Text>
              <Text variant="caption" tone="muted">
                条件：{reward.requirement}
              </Text>
            </Surface>
          ))}
        </div>
        <Button size="lg">升级至 Premium</Button>
      </Surface>

      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="body" weight="bold">
          增值包体
        </Text>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {bundles.map((bundle) => (
            <Surface key={bundle.id} elevation="sunken" radius="lg" padding="md" style={{ width: 260 }}>
              <Text variant="body" weight="bold">
                {bundle.title}
              </Text>
              <Text variant="caption" tone="muted">
                {bundle.contents.join(' / ')}
              </Text>
              <Text variant="body" weight="bold">
                {bundle.price}
              </Text>
              <Button variant="primary">购买</Button>
            </Surface>
          ))}
        </div>
      </Surface>

      <Surface elevation="raised" radius="xl" padding="lg" gap="md" style={{ background: 'rgba(15,23,42,0.68)' }}>
        <Text variant="body" weight="bold">
          虚拟货币说明（反赌博合规）
        </Text>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {currencies.map((currency) => (
            <Surface key={currency.id} elevation="sunken" radius="lg" padding="md" style={{ width: 260 }}>
              <Text variant="body" weight="bold">
                {currency.name}
              </Text>
              <Text variant="caption" tone="muted">
                {currency.description}
              </Text>
            </Surface>
          ))}
        </div>
      </Surface>
    </div>
  );
}
