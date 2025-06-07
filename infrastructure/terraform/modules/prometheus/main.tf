resource "kubernetes_config_map" "istio_alerts" {
  metadata {
    name      = "istio-alerts"
    namespace = "monitoring"
    labels = {
      prometheus-alert = "true"
    }
  }

  data = {
    "istio-alerts.yaml" = file("${path.module}/alerts/istio-alerts.yaml")
  }
}

module "prometheus" {
  source = "../helm-chart"

  chart_name    = "prometheus"
  chart_repo    = "https://prometheus-community.github.io/helm-charts"
  chart_version = "25.1.0"
  namespace     = "monitoring"

  values = [
    templatefile("${path.module}/values.yaml", {
      alertmanagers = "alertmanager-operated:9093"
      alert_rules   = "istio-alerts.yaml"
    })
  ]
}