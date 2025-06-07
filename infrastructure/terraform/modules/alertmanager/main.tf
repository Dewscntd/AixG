module "alertmanager" {
  source = "../helm-chart"

  chart_name    = "alertmanager"
  chart_repo    = "https://prometheus-community.github.io/helm-charts"
  chart_version = "2.35.0"
  namespace     = "monitoring"

  values = [templatefile("${path.module}/values.yaml", {
    config_content = file("${path.module}/config.yaml")
  })]

  set {
    name  = "serviceMonitor.enabled"
    value = "true"
  }

  set {
    name  = "serviceMonitor.namespace"
    value = "monitoring"
  }

  depends_on = [
    kubernetes_namespace.monitoring
  ]
}