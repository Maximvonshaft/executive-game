# 错误码字典（Phase 0）

| 错误码 | HTTP 状态 | 说明 | 前端提示 | 处理建议 |
| --- | --- | --- | --- | --- |
| `AUTH_INITDATA_REQUIRED` | 400 | 未提供 initData 或类型错误 | 缺少登录凭证，请重新发起登录。 | 重新触发 `Telegram.WebApp.requestWriteAccess` 或刷新页面 |
| `AUTH_MALFORMED_INITDATA` | 400 | initData 解析失败或字段缺失 | 登录凭证格式异常，请重新登录。 | 上报 Sentry，提示用户重新登录 |
| `AUTH_HASH_MISSING` | 400 | initData 缺少 hash 字段 | 登录凭证不完整，请重新登录。 | 检查客户端传输逻辑，确保原始 initData 不被改写 |
| `AUTH_INVALID_SIGNATURE` | 401 | hash 校验失败，可能被篡改或过期 | 登录状态已失效，请重新登录。 | 清空本地会话，重新发起授权 |
| `AUTH_EXPIRED` | 401 | auth_date 超出允许窗口 | 登录已过期，请重新登录。 | 引导用户刷新 Mini App |
| `CONFIG_MISSING_SECRET` | 500 | 关键密钥未配置 | 服务配置缺失，请稍后重试。 | 检查环境变量注入、CI/CD Secret 管理 |
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
