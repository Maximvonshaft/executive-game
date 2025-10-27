#!/usr/bin/env bash
set -euo pipefail

# 用法：./infra/scripts/plan-and-apply.sh <env> [plan|apply]
# 例如：./infra/scripts/plan-and-apply.sh dev plan

ENV_NAME=${1:-}
ACTION=${2:-plan}

if [[ -z "${ENV_NAME}" ]]; then
  echo "必须指定环境，例如 dev/staging/prod" >&2
  exit 1
fi

if [[ ! -d "$(dirname "$0")/../terraform/envs/${ENV_NAME}" ]]; then
  echo "未找到环境目录 infra/terraform/envs/${ENV_NAME}" >&2
  exit 1
fi

pushd "$(dirname "$0")/../terraform/envs/${ENV_NAME}" >/dev/null

echo "[INFO] 初始化 Terraform 工作目录 (${ENV_NAME})"
terraform init -upgrade

case "${ACTION}" in
  plan)
    echo "[INFO] 执行 terraform plan"
    terraform plan -out="${ENV_NAME}.tfplan"
    ;;
  apply)
    echo "[INFO] 执行 terraform apply"
    terraform apply "${ENV_NAME}.tfplan"
    ;;
  *)
    echo "未知操作: ${ACTION}，请使用 plan 或 apply" >&2
    exit 1
    ;;
esac

popd >/dev/null
