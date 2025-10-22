export interface AnimationTier {
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  label: string;
  durationRangeMs: [number, number];
  layerBudget: number;
  drawCallBudget: number;
  triggers: string[];
  downgradeStrategy: string;
}

export interface MaterialDefinition {
  id: string;
  name: string;
  description: string;
  palette: string[];
  usage: string;
}

export interface ArtBible {
  themes: {
    id: string;
    name: string;
    palette: string[];
    typography: string[];
    materials: string[];
    description: string;
  }[];
  materials: MaterialDefinition[];
  avatarSets: string[];
}

export interface AssetBundlePolicy {
  target: 'core' | 'remote';
  maxSizeMB: number;
  description: string;
  contents: string[];
}

export interface AssetPipelineDefinition {
  animationTiers: AnimationTier[];
  artBible: ArtBible;
  bundles: AssetBundlePolicy[];
  dprTargets: number[];
  textureFormats: string[];
  fontStrategy: {
    subset: boolean;
    fallbackFamilies: string[];
  };
}

export const assetPipeline: AssetPipelineDefinition = {
  animationTiers: [
    {
      level: 'L1',
      label: '微动效',
      durationRangeMs: [60, 120],
      layerBudget: 2,
      drawCallBudget: 12,
      triggers: ['按钮按压反馈', '段位徽章闪烁', '数字跳动提醒'],
      downgradeStrategy: '低端机保持此级别，关闭色差描边与阴影。'
    },
    {
      level: 'L2',
      label: '功能动效',
      durationRangeMs: [180, 420],
      layerBudget: 6,
      drawCallBudget: 32,
      triggers: ['洗牌与发牌轨迹', '落子轨迹与棋盘震动', '积分入场动画'],
      downgradeStrategy: '降级至 L1，缩短时间轴并移除粒子尾迹。'
    },
    {
      level: 'L3',
      label: '叙事动效',
      durationRangeMs: [420, 900],
      layerBudget: 12,
      drawCallBudget: 72,
      triggers: ['叫/抢地主演出', 'All-in 聚焦', '将军/吃子特写'],
      downgradeStrategy: '低性能时停用景深模糊与体积光，仅保留骨骼关键帧。'
    },
    {
      level: 'L4',
      label: '场景过渡',
      durationRangeMs: [600, 1400],
      layerBudget: 18,
      drawCallBudget: 120,
      triggers: ['大厅→牌桌镜头推拉', '开局→结算镜头衔接', '天气/时段切换'],
      downgradeStrategy: '切换为 L2 的淡入淡出与简单缩放，禁用动态光。'
    },
    {
      level: 'L5',
      label: '主题级演出',
      durationRangeMs: [1500, 3200],
      layerBudget: 32,
      drawCallBudget: 180,
      triggers: ['赛季开场仪式', '段位晋升仪式', '大奖演出'],
      downgradeStrategy: '降至 L3，降低骨骼细分并停用粒子碰撞。'
    }
  ],
  artBible: {
    themes: [
      {
        id: 'aurora-casino',
        name: '极光赛季赌场',
        palette: ['#0f172a', '#1e3a8a', '#38bdf8', '#fef08a'],
        typography: ['"Rubik", sans-serif', '"Noto Sans SC", sans-serif'],
        materials: ['neon-accent', 'frosted-glass', 'gold-foil'],
        description: '用于德扑与斗地主牌桌，主打霓虹与冰晶质感。'
      },
      {
        id: 'jade-battlefield',
        name: '玉麟兵棋苑',
        palette: ['#022c22', '#0f766e', '#34d399', '#fef08a'],
        typography: ['"Cinzel", serif', '"Noto Serif SC", serif'],
        materials: ['lacquer-wood', 'jade-inlay', 'brass-engrave'],
        description: '围棋、象棋等棋类场景，强调木纹与玉石质感。'
      },
      {
        id: 'quantum-orbit',
        name: '量子轨道竞技场',
        palette: ['#020617', '#0ea5e9', '#a855f7', '#f0abfc'],
        typography: ['"Space Grotesk", sans-serif', '"JetBrains Mono", monospace'],
        materials: ['holographic-grid', 'carbon-fiber', 'energy-field'],
        description: '高阶联赛与赛季演出场景，采用科幻粒子与光栅化材质。'
      }
    ],
    materials: [
      {
        id: 'neon-accent',
        name: '霓虹描边',
        description: '高亮描边搭配微量辉光，用于突出交互按钮。',
        palette: ['#22d3ee', '#f472b6', '#facc15'],
        usage: '操作按钮、倒计时环形条以及重点提示。'
      },
      {
        id: 'frosted-glass',
        name: '磨砂玻璃',
        description: '半透明毛玻璃材质，为信息面板提供层级区分。',
        palette: ['rgba(255,255,255,0.92)', 'rgba(148,163,184,0.32)'],
        usage: '玩家信息窗体、操作面板与浮层。'
      },
      {
        id: 'gold-foil',
        name: '金箔压纹',
        description: '用于段位徽章与大奖动效的金属质感。',
        palette: ['#fbbf24', '#d97706', '#78350f'],
        usage: '段位、奖杯、排行榜冠名元素。'
      },
      {
        id: 'lacquer-wood',
        name: '漆木棋盘',
        description: '深色漆木搭配细腻木纹，用于棋类对战。',
        palette: ['#361f0c', '#8c5523', '#deb887'],
        usage: '棋盘主材与棋子底座。'
      },
      {
        id: 'brass-engrave',
        name: '黄铜镶边',
        description: '棋盘边框与段位铭牌所用的金属压纹效果。',
        palette: ['#c08457', '#a16207', '#fde68a'],
        usage: '棋盘包边、奖杯铭文与按钮描边。'
      },
      {
        id: 'jade-inlay',
        name: '玉石镶嵌',
        description: '玉石光泽点缀棋子与权杖。',
        palette: ['#bbf7d0', '#4ade80', '#15803d'],
        usage: '围棋星位、象棋棋子高亮。'
      },
      {
        id: 'holographic-grid',
        name: '全息网格',
        description: '动态扫描线与粒子漂移组成的空间背景。',
        palette: ['rgba(56,189,248,0.65)', 'rgba(147,51,234,0.45)', 'rgba(14,165,233,0.25)'],
        usage: '高级对战场景背景、HUD 动画底层。'
      },
      {
        id: 'carbon-fiber',
        name: '碳纤维底板',
        description: '用于高阶 HUD 的深色织物质感，强调科技感。',
        palette: ['#0f172a', '#1f2937', '#0ea5e9'],
        usage: '竞技场 HUD 底板、按钮背板。'
      },
      {
        id: 'energy-field',
        name: '能量场折射',
        description: '以折射与辉光模拟能量护盾，常与粒子系统结合。',
        palette: ['rgba(14,165,233,0.55)', 'rgba(129,140,248,0.42)', 'rgba(224,231,255,0.18)'],
        usage: 'All-in、终结技与安全区提示等关键演出。'
      }
    ],
    avatarSets: ['aurora-strategist', 'neon-card-master', 'jade-general', 'ember-tactician', 'quantum-dealer', 'astral-scholar']
  },
  bundles: [
    {
      target: 'core',
      maxSizeMB: 8,
      description: '首包资源：基础 UI、字体子集、引导动画 L1-L2。',
      contents: ['UI 纹理切片', '关键字体 woff2 子集', 'Onboarding Lottie 动画']
    },
    {
      target: 'remote',
      maxSizeMB: 120,
      description: '远程资源：高精度角色立绘、Phaser 粒子材质、L3-L5 动画。',
      contents: ['Spine 骨骼动画', '粒子贴图', '高精度音频采样']
    }
  ],
  dprTargets: [1, 2, 3],
  textureFormats: ['webp', 'png', 'ktx2'],
  fontStrategy: {
    subset: true,
    fallbackFamilies: ['"Noto Sans SC"', '"Noto Sans"', 'system-ui']
  }
};
