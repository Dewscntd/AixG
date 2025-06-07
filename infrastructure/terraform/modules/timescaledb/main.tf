module "timescaledb" {
  source = "../helm-chart"

  chart_name    = "timescaledb-single"
  chart_repo    = "https://charts.timescale.com"
  chart_version = "0.19.0"

  namespace = "analytics"
  values = [
    templatefile("${path.module}/values.yaml", {
      storage_class    = "gp3"
      storage_size     = "2Ti"
      cpu_limit        = "4"
      memory_limit     = "16Gi"
      replica_count    = 3
      backup_s3_bucket = module.s3_video_storage.bucket_id
    })
  ]

  depends_on = [
    kubernetes_storage_class.gp3,
    helm_release.pulsar
  ]
}

resource "kubernetes_secret" "timescaledb_backup" {
  metadata {
    name = "timescaledb-backup-credentials"
    namespace = "analytics"
  }

  data = {
    AWS_ACCESS_KEY_ID     = var.aws_access_key
    AWS_SECRET_ACCESS_KEY = var.aws_secret_key
  }
}