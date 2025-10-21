# i18n 资源管理规范（Phase 7）

## 命名约定
- 所有语言资源存放于仓库根目录的 `i18n/` 目录下，文件名为 `{lang}.json`，遵循 [BCP 47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) 语言标签，如 `en`、`zh-CN`。
- JSON 顶层为命名空间对象（如 `tasks`、`banners`、`announcements`），键值层级与前端使用路径保持一致。
- 运营后台导入/导出接口与磁盘文件保持一致结构，可直接使用 `POST /admin/i18n` 导入同名 JSON。

## 热更新流程
1. 管理后台调用 `GET /admin/i18n?lang=<code>` 导出指定语言资源。
2. 在导出的 JSON 上修改或新增文案键值，保持命名空间不变。
3. 调用 `POST /admin/i18n` 将更新后的资源推送到线上，服务端会刷新版本号并广播到 `/api/i18n`。
4. 客户端通过 `/api/i18n?lang=<code>` 拉取最新版本，无需刷新页面即可替换本地文案。

## 语言回退策略
- 服务默认回退语言为 `config.admin.fallbackLanguage`（开发环境默认 `zh-CN`）。
- `/api/i18n` 返回的 `fallbackLanguage` 字段用于前端确认回退链路。
- 所有服务端文案在缺失目标语言时，自动回退到回退语言文本。

## 无障碍基线
- `/api/accessibility` 返回的配置包含 `minimumContrastRatio`、`supportsRTL` 等字段，用于驱动前端主题切换。
- 运营端可通过 `POST /admin/accessibility` 调整基线，变更会实时反映在公共接口。
