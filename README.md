# executive-game

## 项目简介
基于 Phaser 3 + TypeScript 的跨平台斗地主项目，目标同时支持微信/抖音小程序、Telegram WebApp 与标准 H5 浏览器体验，提供单机 AI 与联机实时对战能力。

## 快速上手
1. 安装依赖：推荐使用 Node.js 18 LTS 搭配 pnpm 8。
2. 克隆仓库后执行 `pnpm install` 安装依赖。
3. 参考 [`development/phaser3-ddz-plan.md`](development/phaser3-ddz-plan.md) 第 26 章完成本地环境准备（数据库、Redis、环境变量等）。
4. 根据目标平台运行对应开发脚本，例如：
   - `pnpm dev:wechat`：启动微信/抖音小程序调试构建。
   - `pnpm dev:telegram`：本地预览 Telegram WebApp。
   - `pnpm dev:h5`：启动 H5 调试服务器。

## 常用脚本
| 命令 | 说明 |
| --- | --- |
| `pnpm dev:*` | 各平台调试入口（wechat/tiktok/telegram/h5/server 等）。 |
| `pnpm build:*` | 平台构建产物生成。 |
| `pnpm test` | 执行单元与集成测试。 |
| `pnpm lint` | 代码静态检查。 |
| `pnpm db:migrate` | 执行数据库迁移。 |
| `pnpm db:seed` | 初始化测试数据。 |

## 进一步阅读
* 详细设计、协议、数据库与运维策略请参阅 [`development/phaser3-ddz-plan.md`](development/phaser3-ddz-plan.md)。
