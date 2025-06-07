module "pulsar" {
  source = "../helm-chart"

  chart_name    = "pulsar"
  chart_repo    = "https://pulsar.apache.org/charts"
  chart_version = "3.1.6"

  namespace = "message-system"
  values = [
    templatefile("${path.module}/values.yaml", {
      cluster_name = var.cluster_name
      storage_class = "gp3"
      broker_replicas = 3
      bookie_replicas = 5
      zk_replicas = 3
      gpu_enabled = true
    })
  ]

  depends_on = [module.eks]
}

resource "kubernetes_storage_class" "pulsar_gp3" {
  metadata {
    name = "gp3"
  }
  storage_provisioner = "ebs.csi.aws.com"
  parameters = {
    type = "gp3"
    encrypted = "true"
  }
  allow_volume_expansion = true
}