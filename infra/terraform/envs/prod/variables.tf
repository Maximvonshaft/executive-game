variable "project" {
  description = "项目代号"
  type        = string
  default     = "phaser3-ddz"
}

variable "region" {
  description = "部署区域"
  type        = string
  default     = "ap-southeast-1"
}

variable "allowed_cidrs" {
  description = "允许访问内部服务的 CIDR"
  type        = list(string)
  default     = []
}
