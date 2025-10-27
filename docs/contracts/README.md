# API 与实时协议契约说明

本目录存放 Phaser3-DDZ 项目的对外契约文件，供前后端、QA 与运营协同使用。

## 结构

```
contracts/
├── openapi.yaml         # REST API 契约（登录、匹配、战绩等）
└── ws/
    └── README.md        # WebSocket 事件流说明与示例
```

## 使用约定

1. OpenAPI 契约通过 `pnpm scripts:codegen`（后续脚手架提供）生成 TypeScript 类型，前端与服务端共享。
2. QA 使用 `openapi-generator` 生成 Mock Server，配合 Playwright 进行端到端测试。
3. WebSocket 事件格式与 `proto/room-events.md` 同步，任何改动需同步更新两侧文件。
4. 所有契约提交均需在 PR 中通过评审并更新版本号。

## 更新流程

1. 在修改契约前创建对应 Issue，标记影响范围。
2. 更新 `openapi.yaml` 或 `ws/README.md` 后，运行 `pnpm lint:contracts`（脚手架待补充）确保格式正确。
3. 在 Release Notes 中记录影响的接口与兼容性策略。

最后更新：2024-05-28。
