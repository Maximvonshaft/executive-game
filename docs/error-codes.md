# 错误码字典（Phase 1）

| 错误码 | HTTP 状态 | 说明 | 前端提示 | 处理建议 |
| --- | --- | --- | --- | --- |
| `AUTH_INITDATA_REQUIRED` | 400 | 未提供 initData 或类型错误 | 缺少登录凭证，请重新发起登录。 | 重新触发 `Telegram.WebApp.requestWriteAccess` 或刷新页面 |
| `AUTH_MALFORMED_INITDATA` | 400 | initData 解析失败或字段缺失 | 登录凭证格式异常，请重新登录。 | 上报 Sentry，提示用户重新登录 |
| `AUTH_HASH_MISSING` | 400 | initData 缺少 hash 字段 | 登录凭证不完整，请重新登录。 | 检查客户端传输逻辑，确保原始 initData 不被改写 |
| `AUTH_INVALID_SIGNATURE` | 401 | hash 校验失败，可能被篡改或过期 | 登录状态已失效，请重新登录。 | 清空本地会话，重新发起授权 |
| `AUTH_EXPIRED` | 401 | auth_date 超出允许窗口 | 登录已过期，请重新登录。 | 引导用户刷新 Mini App |
| `AUTH_TOKEN_REQUIRED` | 401 | 缺少 Bearer Token | 登录状态已失效，请重新登录。 | 重新获取 JWT，必要时重新登录 |
| `AUTH_INVALID_TOKEN` | 401 | Token 解析或校验失败 | 会话验证失败，请重新登录。 | 清理缓存 Token，重新走登录流程 |
| `CONFIG_MISSING_SECRET` | 500 | 关键密钥未配置 | 服务配置缺失，请稍后重试。 | 检查环境变量注入、CI/CD Secret 管理 |
| `MATCH_ALREADY_SEARCHING` | 409 | 玩家已在匹配队列中 | 正在匹配中，请耐心等待。 | 禁止重复点击，展示等待动效 |
| `MATCH_NOT_IN_QUEUE` | 404 | 玩家不在匹配队列 | 当前没有进行中的匹配请求。 | 更新 UI 状态，提示可重新发起匹配 |
| `MATCH_UNSUPPORTED_GAME` | 400 | 请求的游戏不支持匹配 | 该游戏暂不可匹配，请稍后再试。 | 灰度或隐藏入口，检查游戏元数据 |
| `ROOM_NOT_FOUND` | 404 | 房间不存在或已结束 | 房间不存在或已结束。 | 返回大厅或刷新房间列表 |
| `ROOM_NOT_MEMBER` | 403 | 非房间成员 | 你没有加入该房间。 | 阻止非法加入，提供返回大厅按钮 |
| `ROOM_FULL` | 409 | 房间人数已满 | 房间人数已满，无法加入。 | 建议创建新房间或等待空位 |
| `ROOM_ALREADY_READY` | 409 | 玩家已准备 | 已准备完毕，请等待对手。 | 禁用重复点击“准备”按钮 |
| `ROOM_ACTION_INVALID` | 422 | 行为不合法（越界、落子冲突等） | 当前操作无效，请检查后重试。 | 高亮提示错误原因，保留现有状态 |
| `ROOM_ACTION_OUT_OF_TURN` | 409 | 非当前行动方 | 还未轮到你行动。 | 保持原状态，突出当前行动方 |
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
