terraform {
  required_version = ">= 1.5.0"
  # TODO: 配置后端（例如 Terraform Cloud 或远端状态存储）
}

locals {
  environment = "dev"
}

module "postgres" {
  source              = "../../modules/postgres"
  project             = var.project
  environment         = local.environment
  region              = var.region
  allowed_cidrs       = var.allowed_cidrs
  instance_class      = "db.t4g.large"
  storage_gb          = 50
  backup_retention_days = 3
}

module "redis" {
  source        = "../../modules/redis"
  project       = var.project
  environment   = local.environment
  region        = var.region
  allowed_cidrs = var.allowed_cidrs
  node_type     = "cache.t4g.small"
  num_replicas  = 0
}

module "object_storage" {
  source              = "../../modules/object_storage"
  project             = var.project
  environment         = local.environment
  region              = var.region
  versioning_enabled  = false
  lifecycle_rules     = []
}

module "ci_role" {
  source               = "../../modules/ci_role"
  project              = var.project
  environment          = local.environment
  allowed_repositories = ["${var.project}/*"]
}
