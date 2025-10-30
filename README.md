# 单机版 Phaser 3 斗地主

这是一个使用 Phaser 3 构建的单机斗地主小游戏，支持自适应页面尺寸，内置简单 AI 对手。

## 功能概览

- 标准 54 张牌的洗牌、发牌与地主随机确定
- 支持顺子、连对、三带一/对、飞机、炸弹、火箭等常见牌型识别
- AI 会在自己回合选择合法出牌或自动过牌
- 玩家可点击选牌，支持提示、出牌、不出等操作
- 自适应窗口尺寸，方便在不同分辨率下游玩

## 本地运行

```bash
npm install   # 可选，如需使用第三方静态服务器
npm run serve # 启动本地静态服务器，默认端口 5173
```

若未安装额外依赖，也可以自行使用任意静态服务器（如 `python -m http.server`）在项目根目录下直接运行。

## 代码检查与测试

项目内置简单的语法检查与逻辑单元测试，推荐在每次改动后运行：

```bash
npm run lint
npm test
```

## 项目结构

```
├── index.html          # 入口 HTML，引用 Phaser CDN
├── src/
│   ├── main.js         # Phaser 启动配置
│   └── game/
│       ├── GameScene.js  # 场景与游戏主逻辑
│       └── CardUtils.js  # 牌型判定、AI 策略工具函数
├── scripts/
│   ├── lint.js         # 简易语法检查脚本（调用 node --check）
│   └── serve.js        # 本地静态服务器
└── tests/
    └── run-tests.js    # CardUtils 单元测试
```

## 注意事项

- `index.html` 通过 CDN 加载 Phaser，如需离线使用可将 Phaser 包下载至本地并调整引用路径。
- 当前 AI 策略为启发式，追求流畅体验而非最优出牌。
