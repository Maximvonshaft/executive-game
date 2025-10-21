# 错误码字典（Phase 5）

| 错误码 | HTTP 状态 | 说明 | 前端提示 | 处理建议 |
| --- | --- | --- | --- | --- |
| `AUTH_INITDATA_REQUIRED` | 400 | 未提供 initData 或类型错误 | 缺少登录凭证，请重新发起登录。 | 重新触发 `Telegram.WebApp.requestWriteAccess` 或刷新页面 |
| `AUTH_MALFORMED_INITDATA` | 400 | initData 解析失败或字段缺失 | 登录凭证格式异常，请重新登录。 | 上报 Sentry，提示用户重新登录 |
| `AUTH_HASH_MISSING` | 400 | initData 缺少 hash 字段 | 登录凭证不完整，请重新登录。 | 检查客户端传输逻辑，确保原始 initData 不被改写 |
| `AUTH_INVALID_SIGNATURE` | 401 | hash 校验失败，可能被篡改或过期 | 登录状态已失效，请重新登录。 | 清空本地会话，重新发起授权 |
| `AUTH_EXPIRED` | 401 | auth_date 超出允许窗口 | 登录已过期，请重新登录。 | 引导用户刷新 Mini App |
| `AUTH_TOKEN_REQUIRED` | 401 | 未携带 Bearer Token | 请先登录后再进行操作。 | 重新走登录流程，注入 JWT |
| `AUTH_TOKEN_INVALID` | 401 | Token 已过期或签名错误 | 会话已失效，请重新登录。 | 清空本地 token，重新登录 |
| `REQUEST_BODY_INVALID` | 400 | JSON 解析失败 | 请求格式错误，请稍后重试。 | 检查请求序列化逻辑 |
| `MATCH_GAME_NOT_FOUND` | 404 | gameId 不存在 | 找不到对应的游戏，请刷新后重试。 | 同步最新游戏列表 |
| `MATCH_PLAYER_IN_ROOM` | 409 | 玩家已有活跃房间 | 正在进行中的对局无法重复匹配。 | 引导跳转到现有房间 |
| `MATCH_TICKET_NOT_FOUND` | 404 | ticketId 无效 | 匹配请求不存在或已过期。 | 提示刷新大厅 |
| `MATCH_TICKET_FORBIDDEN` | 403 | ticket 不属于当前玩家 | 无权取消该匹配请求。 | 确认身份或清理脏数据 |
| `MATCH_ALREADY_ASSIGNED` | 409 | ticket 已生成房间 | 对局已生成，无法取消。 | 引导进入房间 |
| `ROOM_NOT_FOUND` | 404 | 房间不存在或已销毁 | 房间不存在或已关闭。 | 刷新房间列表，提示重新匹配 |
| `ROOM_NOT_MEMBER` | 403 | 非房间成员访问 | 您无权访问该房间。 | 检查房间 ID 或重新匹配 |
| `ROOM_NOT_OWNER` | 403 | 非房主执行房主操作 | 只有房主可以执行该操作。 | 引导联系房主或切换账号 |
| `ROOM_ID_REQUIRED` | 400 | 缺少 roomId | 缺少房间编号。 | 校验请求参数 |
| `ROOM_ALREADY_FINISHED` | 409 | 对局已结束 | 对局已结束。 | 引导进入结算页或重新匹配 |
| `ROOM_ALREADY_ACTIVE` | 409 | 对局已在进行中 | 对局正在进行中，无法加入。 | 提示稍后再试或观看观战流 |
| `ROOM_INVITE_INVALID` | 403 | 邀请码失效或错误 | 邀请码无效或已过期。 | 重新索取邀请码 |
| `ROOM_FULL` | 409 | 房间人数已满 | 房间人数已满，无法加入。 | 提示等待空位或新建房间 |
| `ROOM_PLAYER_BLOCKED` | 403 | 玩家被房主或成员拉黑 | 您已被房主或成员拉黑，无法加入房间。 | 建议联系房主处理 |
| `ROOM_SPECTATORS_DISABLED` | 403 | 房间关闭观战 | 该房间未开启观战功能。 | 引导尝试其他房间 |
| `ROOM_SPECTATORS_LIMIT` | 429 | 观战人数超限 | 观战人数已达上限，请稍后再试。 | 等待空位或联系房主调高上限 |
| `ROOM_SPECTATOR_FORBIDDEN` | 403 | 观战身份执行受限动作 | 观战模式下无法执行此操作。 | 提示切换为玩家身份 |
| `ROOM_ACTION_UNSUPPORTED` | 400 | 不支持的房间操作 | 不支持的房间操作。 | 检查 action 参数 |
| `AI_GAME_UNSUPPORTED` | 400 | 请求 AI 建议的玩法未接入 | 当前玩法暂不支持 AI 建议。 | 引导用户切换至已支持玩法或等待更新 |
| `AI_POSITION_INVALID` | 400 | 提供的局面数据非法或顺序不符 | 局面数据不合法，请检查后再试。 | 校验落子顺序、棋盘范围及执手方 |
| `AI_RATE_LIMITED` | 429 | AI 提示请求过于频繁 | 提示请求过于频繁，请稍后再试。 | 根据返回的 `retryAfterMs` 做倒计时提醒 |
| `CONFIG_MISSING_SECRET` | 500 | 关键密钥未配置 | 服务配置缺失，请稍后重试。 | 检查环境变量注入、CI/CD Secret 管理 |
| `TASK_NOT_FOUND` | 404 | 任务定义不存在 | 任务不存在或已下线。 | 刷新任务列表，更新客户端缓存 |
| `TASK_NOT_AVAILABLE` | 404 | 当前无法领取该任务 | 当前无法领取该任务，请刷新后再试。 | 再次请求 `/api/tasks/today` 获取最新状态 |
| `TASK_NOT_COMPLETED` | 409 | 任务进度不足 | 任务尚未完成，继续加油吧。 | 引导用户完成剩余目标 |
| `TASK_ALREADY_CLAIMED` | 409 | 奖励重复领取 | 奖励已领取，请勿重复操作。 | 隐藏领取按钮或提示今日已领 |
| `FRIEND_SELF_FORBIDDEN` | 400 | 尝试添加自己为好友 | 无法添加自己为好友。 | 检查目标 ID |
| `FRIEND_TARGET_REQUIRED` | 400 | 缺少好友目标 | 请指定要操作的玩家。 | 校验请求参数 |
| `SERVER_ERROR` | 500 | 未捕获的内部错误 | 系统开小差了，请稍后再试。 | 上报监控，排查服务日志 |

## 文案映射规范
- 所有错误响应结构统一：
  ```json
  {
    "success": false,
    "error": {
      "code": "AUTH_INVALID_SIGNATURE",
      "message": "登录状态已失效，请重新登录。",
      "details": null
    }
  }
  ```
- 客户端根据 `code` 做分支逻辑，`message` 直接用于 Toast/对话框。
- 未知错误码默认文案：`系统开小差了，请稍后再试。`
- WebSocket `error` 事件沿用同一错误码语义，客户端可复用相同文案。
