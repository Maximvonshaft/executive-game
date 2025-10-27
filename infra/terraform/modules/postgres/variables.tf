variable "project" {
  description = "项目代号，例如 phaser3-ddz"
  type        = string
}

variable "environment" {
  description = "部署环境，dev/staging/prod"
  type        = string
}

variable "region" {
  description = "数据库部署区域"
  type        = string
}

variable "instance_class" {
  description = "数据库实例规格"
  type        = string
  default     = "db.m6g.large"
}

variable "storage_gb" {
  description = "存储大小（GB）"
  type        = number
  default     = 100
}

variable "backup_retention_days" {
  description = "备份保留天数"
  type        = number
  default     = 7
}

variable "allowed_cidrs" {
  description = "允许访问数据库的网段"
  type        = list(string)
  default     = []
}
