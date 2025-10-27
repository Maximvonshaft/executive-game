# Telegram 深链配置指引

本文补充 Telegram WebApp 与 Bot 的深链参数设计，用以取代方案中缺失的 `ops/telegram-deeplink.xlsx`。后续若需表格版可由本文件导出。

## 1. 深链参数约定

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `scene` | `lobby` / `room` / `replay` / `event` | 场景标识 |
| `roomId` | `room-9c2f1` | 邀请加入的房间号（可选） |
| `inviteUser` | `uid-123` | 邀请人 UID（统计使用） |
| `matchMode` | `RANKED` / `CASUAL` | 匹配模式 |
| `activityId` | `spring-fest` | 活动/赛事标识 |
| `locale` | `zh-CN` / `en` | 强制语言（可选） |

生成样例：

```
https://t.me/ddz_bot/ddz_webapp?startapp=scene%3Dlobby%26matchMode%3DRANKED
```

## 2. WebApp 启动流程

1. Bot 根据业务生成 `startapp` 参数，附加在消息按钮或菜单项中。
2. WebApp 启动后通过 `Telegram.WebApp.initDataUnsafe.start_param` 解析深链，透传给客户端路由。
3. 客户端根据 `scene` 决定跳转逻辑：
   * `lobby`：进入大厅；
   * `room`：校验房间容量后加入；
   * `replay`：跳转回放页面；
   * `event`：打开活动详情。

## 3. 群组运营场景

| 场景 | Bot 指令/交互 | 深链参数 | 备注 |
| --- | --- | --- | --- |
| 快速开房 | `/create_room` + Inline Keyboard | `scene=room&roomId={generated}` | 自动邀请当前群成员 |
| 战报推送 | Webhook → `sendMessage` | `scene=replay&replayId={id}` | 携带分享缩略图 |
| 活动报名 | `/event` | `scene=event&activityId={id}` | 支持多语言文案 |

## 4. 节流策略

* 对同一 `uid` 的活动推送，默认 6 小时内不重复下发。
* 群组广播遵循 Telegram 速率限制：`20 messages/minute`。
* WebApp 打开后，客户端需在 5 秒内 `POST /bot/deeplink/opened`，用于统计与节流。

## 5. 配置与发布

1. 运维在 `ops/checklists/telegram.md` 中登记最新活动与指令。
2. 发布前通过 `telegram-deeplink.test.json`（后续自动化脚本）验证参数合法性。
3. 所有更改需提前 1 个工作日通知运营与 QA。

最后更新：2024-05-28。
