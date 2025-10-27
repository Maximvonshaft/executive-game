variable "project" {
  description = "项目代号"
  type        = string
}

variable "environment" {
  description = "部署环境"
  type        = string
}

variable "oidc_provider" {
  description = "GitHub Actions OIDC Provider 标识"
  type        = string
  default     = "token.actions.githubusercontent.com"
}

variable "allowed_repositories" {
  description = "允许获取临时凭证的仓库列表"
  type        = list(string)
  default     = []
}
