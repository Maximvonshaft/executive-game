variable "project" {
  description = "项目代号"
  type        = string
}

variable "environment" {
  description = "部署环境"
  type        = string
}

variable "region" {
  description = "存储区域"
  type        = string
}

variable "versioning_enabled" {
  description = "是否开启版本控制"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "对象存储生命周期配置（待实现）"
  type        = any
  default     = []
}
