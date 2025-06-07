module "grafana" {
  source = "../helm-chart"

  chart_name    = "grafana"
  chart_repo    = "https://grafana.github.io/helm-charts"
  chart_version = "7.3.1"
  namespace     = "monitoring"

  values = [templatefile("${path.module}/values.yaml", {
    dashboard_label_selector = "grafana_dashboard=1"
    prometheus_url           = "http://prometheus-server.monitoring:80"
  })]
}