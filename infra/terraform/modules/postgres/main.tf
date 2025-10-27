terraform {
  required_version = ">= 1.5.0"
}

# TODO: 在此处根据选定云厂商实现数据库实例、子网、安全组等资源。
# 目前仅提供骨架，确保 terraform validate 可执行。

locals {
  module_todo = "Implement PostgreSQL resources"
}
