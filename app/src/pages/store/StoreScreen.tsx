import { useState } from 'react';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { spacingScale } from '../../theme/tokens';
import { useSafeAreaInsets } from '../../hooks/useSafeAreaInsets';
import { useOrientation } from '../../hooks/useOrientation';
import { useToast } from '../../providers/ToastProvider';

type StoreScreenProps = {
  onClose: () => void;
};

type StoreItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  tag?: string;
};

const featuredItems: StoreItem[] = [
  {
    id: 'pass-elite',
    name: 'S13 赛季通行证·精英',
    description: '解锁主题级演出、段位晋升动画、All-in 粒子特效以及专属表情。',
    imageUrl: 'https://cdn.pixabay.com/photo/2020/08/15/08/12/fantasy-5483267_1280.jpg',
    price: '¥68',
    tag: '限时返场'
  },
  {
    id: 'effect-allin',
    name: 'All-in 星流光束',
    description: 'All-in 演出升级：动态景深 + 体积光 + 粒子尾迹，支持性能降级策略。',
    imageUrl: 'https://cdn.pixabay.com/photo/2019/03/01/14/24/space-4025882_1280.jpg',
    price: '¥28'
  },
  {
    id: 'board-xiangqi',
    name: '象棋·龙吟棋盘',
    description: '高对比棋盘材质 + 龙形落子轨迹，兼容色弱模式。',
    imageUrl: 'https://cdn.pixabay.com/photo/2017/02/07/16/41/chess-2040215_1280.jpg',
    price: '¥42'
  }
];

const dailyDeals: StoreItem[] = [
  {
    id: 'avatar-aurora',
    name: '头像·极光使者',
    description: '登陆大厅即触发极光环绕动效。',
    imageUrl: 'https://cdn.pixabay.com/photo/2020/08/13/09/54/woman-5480351_1280.jpg',
    price: '¥18',
    tag: '每日折扣'
  },
  {
    id: 'chip-pack',
    name: '筹码补给·尊享',
    description: '包含 120,000 筹码 + 连胜保护券 ×3。',
    imageUrl: 'https://cdn.pixabay.com/photo/2015/04/14/20/07/poker-723342_1280.jpg',
    price: '¥45'
  }
];

export function StoreScreen({ onClose }: StoreScreenProps) {
  const insets = useSafeAreaInsets();
  const orientation = useOrientation();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);

  const handlePurchase = (item: StoreItem) => {
    setSelected(item.id);
    toast.present({
      title: '已加入购买队列',
      description: `${item.name} 将在支付确认后立即生效`,
      tone: 'positive'
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacingScale.lg,
        padding: `${spacingScale.lg + insets.top}px ${spacingScale.lg + insets.right}px ${spacingScale.lg + insets.bottom}px ${spacingScale.lg + insets.left}px`
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text variant="headline" weight="bold">
            星河商城
          </Text>
          <Text variant="caption" tone="muted">
            赛季限定内容仅提供外观、特效与社交表达，不影响对局公平性。
          </Text>
        </div>
        <Button variant="outline" onClick={onClose}>
          返回
        </Button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: spacingScale.lg
        }}
      >
        {featuredItems.map((item) => (
          <Surface
            key={item.id}
            padding="lg"
            elevation="raised"
            radius="lg"
            className="neon-border"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacingScale.md,
              borderRadius: 28,
              backgroundImage: `linear-gradient(180deg, rgba(6,12,25,0.6), rgba(6,12,25,0.92)), url(${item.imageUrl})`,
              backgroundSize: 'cover'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="subtitle" weight="bold">
                {item.name}
              </Text>
              {item.tag ? (
                <span style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(100,255,218,0.16)', borderRadius: 999 }}>
                  {item.tag}
                </span>
              ) : null}
            </div>
            <Text variant="body" tone="muted">
              {item.description}
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="subtitle" weight="bold">
                {item.price}
              </Text>
              <Button onClick={() => handlePurchase(item)}>
                购买
              </Button>
            </div>
          </Surface>
        ))}
      </section>

      <Surface
        padding="lg"
        elevation="raised"
        radius="lg"
        className="neon-border"
        style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.md, borderRadius: 28 }}
      >
        <Text variant="subtitle" weight="bold">
          每日特惠
        </Text>
        <div style={{ display: 'grid', gap: spacingScale.md, gridTemplateColumns: orientation === 'portrait' ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
          {dailyDeals.map((deal) => (
            <Surface
              key={deal.id}
              padding="md"
              elevation="sunken"
              radius="lg"
              className="neon-border"
              style={{ display: 'flex', flexDirection: 'column', gap: spacingScale.sm, borderRadius: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body" weight="bold">
                  {deal.name}
                </Text>
                {deal.tag ? <Text variant="caption" tone="positive">{deal.tag}</Text> : null}
              </div>
              <Text variant="caption" tone="muted">
                {deal.description}
              </Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body" weight="bold">
                  {deal.price}
                </Text>
                <Button variant={selected === deal.id ? 'secondary' : 'primary'} onClick={() => handlePurchase(deal)}>
                  {selected === deal.id ? '已加入' : '兑换'}
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </Surface>
    </div>
  );
}
