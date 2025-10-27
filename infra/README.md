# 基础设施与环境配置索引

本目录用于记录 Phaser3-DDZ 项目的基础设施蓝图和 Terraform 模块约定，以解决方案中缺失的 `infra/terraform` 信息空档。当前仅提供文档索引，后续补充 Terraform 代码时请遵循以下规范。

## 1. 环境划分

| 环境 | Terraform Workspace | 目标 | 备注 |
| --- | --- | --- | --- |
| `dev` | `ddz-dev` | 团队开发联调环境 | 共享实例，启用成本告警 |
| `staging` | `ddz-staging` | 预发回归与压测 | 拷贝生产配置，缩容资源 |
| `prod` | `ddz-prod` | 正式生产环境 | 启用高可用、读写分离 |

## 2. 核心组件

* **数据库**：PostgreSQL 15（RDS/CloudSQL），以 Terraform module `./terraform/modules/postgres` 管理，默认创建主从实例、自动备份 7 天。
* **缓存**：Redis 7（Managed Redis/ElastiCache），module `./terraform/modules/redis`，支持多节点副本和自动备份。
* **对象存储**：S3/OSS/OBS 兼容，module `./terraform/modules/object_storage`，用于回放和静态资源。
* **监控与日志**：Prometheus + Grafana + Loki，部署在 Kubernetes 或 VM，Terraform 仅创建基础设施与权限。
* **CI/CD 凭证**：GitHub Actions OIDC 角色，module `./terraform/modules/ci_role`。

## 3. 目录结构建议

```
infra/
├── README.md
├── terraform/
│   ├── modules/
│   │   ├── postgres/
│   │   ├── redis/
│   │   ├── object_storage/
│   │   └── ci_role/
│   ├── envs/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── variables.tf
└── scripts/
    └── plan-and-apply.sh
```

## 4. 变量约定

| 变量 | 类型 | 说明 |
| --- | --- | --- |
| `project` | string | 统一项目代号，例如 `phaser3-ddz` |
| `region` | string | 部署区域，如 `ap-southeast-1` |
| `db_instance_class` | string | 数据库规格，默认 `db.m6g.large` |
| `redis_node_type` | string | Redis 节点规格 |
| `allowed_cidrs` | list(string) | 允许访问 API 的 CIDR 列表 |

## 5. 操作流程

1. 初始化：`terraform init`（在对应 env 目录）。
2. 预览：`terraform plan -var-file=env.tfvars`。
3. 部署：`terraform apply`，需双人评审。
4. 变更记录需同步到 `ops/change-log.md`（待补充）。

## 6. 后续任务

* [x] 创建 Terraform 模块骨架与环境目录（PostgreSQL、Redis、对象存储、CI 角色）。
* [x] 编写 `scripts/plan-and-apply.sh` 自动化脚本。
* [ ] 将 AWS/Aliyun/GCP 凭证管理方案补充到 `ops/security.md`。

最后更新：2024-05-28。
