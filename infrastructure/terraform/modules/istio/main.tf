module "istio_base" {
  source = "../helm-chart"

  chart_name    = "base"
  chart_repo    = "https://istio-release.storage.googleapis.com/charts"
  chart_version = "1.20.0"
  namespace     = "istio-system"
}

module "istiod" {
  source = "../helm-chart"

  chart_name    = "istiod"
  chart_repo    = "https://istio-release.storage.googleapis.com/charts"
  chart_version = "1.20.0"
  namespace     = "istio-system"

  values = [
    file("${path.module}/istiod-values.yaml")
  ]

  depends_on = [module.istio_base]
}

resource "kubectl_manifest" "mesh" {
  yaml_body = <<YAML
apiVersion: networking.istio.io/v1alpha3
kind: MeshConfig
metadata:
  name: default
spec:
  enableAutoMtls: true
  accessLogFile: /dev/stdout
YAML
}