output "postgres" {
  value = {
    endpoint        = module.postgres.endpoint
    admin_username  = module.postgres.admin_username
  }
}

output "redis" {
  value = {
    endpoint = module.redis.endpoint
  }
}

output "object_storage" {
  value = {
    bucket_name = module.object_storage.bucket_name
  }
}

output "ci_role" {
  value = {
    role_arn = module.ci_role.role_arn
  }
}
