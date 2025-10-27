variable "project" {
  description = "项目代号"
  type        = string
}

variable "environment" {
  description = "部署环境"
  type        = string
}

variable "region" {
  description = "部署区域"
  type        = string
}

variable "node_type" {
  description = "Redis 节点规格"
  type        = string
  default     = "cache.m6g.large"
}

variable "num_replicas" {
  description = "副本数量"
  type        = number
  default     = 1
}

variable "allowed_cidrs" {
  description = "允许访问 Redis 的网段"
  type        = list(string)
  default     = []
}
