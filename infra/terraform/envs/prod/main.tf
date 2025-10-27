terraform {
  required_version = ">= 1.5.0"
}

locals {
  environment = "prod"
}

module "postgres" {
  source              = "../../modules/postgres"
  project             = var.project
  environment         = local.environment
  region              = var.region
  allowed_cidrs       = var.allowed_cidrs
  instance_class      = "db.m6g.xlarge"
  storage_gb          = 200
  backup_retention_days = 14
}

module "redis" {
  source        = "../../modules/redis"
  project       = var.project
  environment   = local.environment
  region        = var.region
  allowed_cidrs = var.allowed_cidrs
  node_type     = "cache.m6g.xlarge"
  num_replicas  = 2
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
