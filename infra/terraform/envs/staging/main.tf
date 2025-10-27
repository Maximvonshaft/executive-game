terraform {
  required_version = ">= 1.5.0"
}

locals {
  environment = "staging"
}

module "postgres" {
  source              = "../../modules/postgres"
  project             = var.project
  environment         = local.environment
  region              = var.region
  allowed_cidrs       = var.allowed_cidrs
  instance_class      = "db.m6g.large"
  storage_gb          = 100
  backup_retention_days = 7
}

module "redis" {
  source        = "../../modules/redis"
  project       = var.project
  environment   = local.environment
  region        = var.region
  allowed_cidrs = var.allowed_cidrs
  node_type     = "cache.m6g.large"
  num_replicas  = 1
}

module "object_storage" {
  source              = "../../modules/object_storage"
  project             = var.project
  environment         = local.environment
  region              = var.region
  versioning_enabled  = true
  lifecycle_rules     = []
}

module "ci_role" {
  source               = "../../modules/ci_role"
  project              = var.project
  environment          = local.environment
  allowed_repositories = ["${var.project}/*"]
}
