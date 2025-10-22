import { Surface } from '../components/Surface';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { spacingScale } from '../theme/tokens';

const bundles = [
  {
    id: 'season-pass',
    title: '赛季通行证',
    description: '解锁段位晋升演出、独家头像框与 ALL-IN 炫光',
    price: '¥68',
    highlights: ['100 级赛季任务', '炫光发牌动画', '专属聊天表情']
  },
  {
    id: 'express-training',
    title: '进阶训练包',
    description: '解锁斗地主/德扑深度教学、AI 推演与关键回合复盘',
    price: '¥45',
    highlights: ['24 节高级课程', 'AI 托底陪练', '胜率分析报告']
  },
  {
    id: 'glory-bundle',
    title: '荣耀演出包',
    description: '上庄特写、赛季开场全屏演出、冠军奖杯特效',
    price: '¥98',
    highlights: ['L5 主题级演出', '全屏粒子风暴', '动态徽章']
  }
];

export function ShopScreen() {
  return (
    <div style={{ display: 'grid', gap: spacingScale.xl }}>
      <Surface padding="xl" radius="xl" elevation="raised" gap="lg">
        <Text variant="title" weight="bold">
          活动中心
        </Text>
        <Text variant="body" tone="muted">
          每日任务、冲刺任务、成长任务、连续登录奖励与赛季通行证全部集成，重资产素材走远程包体并带版本缓存。
        </Text>
        <Button variant="primary">查看今日活动</Button>
      </Surface>
      <div style={{ display: 'grid', gap: spacingScale.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {bundles.map((bundle) => (
          <Surface key={bundle.id} padding="lg" radius="xl" elevation="raised" gap="md">
            <Text variant="body" weight="bold">
              {bundle.title}
            </Text>
            <Text variant="caption" tone="muted">
              {bundle.description}
            </Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {bundle.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title" weight="bold">
                {bundle.price}
              </Text>
              <Button variant="outline">购买</Button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
