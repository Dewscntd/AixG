# Flagger Canary Deployment Module for FootAnalytics
# Provides progressive delivery with automated rollbacks

resource "kubernetes_namespace" "flagger" {
  metadata {
    name = "flagger-system"
    labels = {
      "app.kubernetes.io/name" = "flagger"
      "app.kubernetes.io/part-of" = "footanalytics"
      "istio-injection" = "enabled"
    }
  }
}

# Flagger Helm Chart Installation
resource "helm_release" "flagger" {
  name       = "flagger"
  repository = "https://flagger.app"
  chart      = "flagger"
  version    = "1.32.0"
  namespace  = kubernetes_namespace.flagger.metadata[0].name

  values = [
    templatefile("${path.module}/values.yaml", {
      prometheus_url = var.prometheus_url
      slack_webhook_url = var.slack_webhook_url
    })
  ]

  set {
    name  = "meshProvider"
    value = "istio"
  }

  set {
    name  = "metricsServer"
    value = var.prometheus_url
  }

  set {
    name  = "slack.url"
    value = var.slack_webhook_url
  }

  depends_on = [kubernetes_namespace.flagger]
}

# Flagger Grafana Dashboard
resource "helm_release" "flagger_grafana" {
  name       = "flagger-grafana"
  repository = "https://flagger.app"
  chart      = "grafana"
  version    = "1.32.0"
  namespace  = kubernetes_namespace.flagger.metadata[0].name

  set {
    name  = "url"
    value = var.grafana_url
  }

  depends_on = [helm_release.flagger]
}

# Canary configuration for API Gateway
resource "kubernetes_manifest" "api_gateway_canary" {
  manifest = {
    apiVersion = "flagger.app/v1beta1"
    kind       = "Canary"
    metadata = {
      name      = "api-gateway"
      namespace = "footanalytics"
      labels = {
        "app.kubernetes.io/name" = "api-gateway"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      # Deployment reference
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "api-gateway"
      }
      
      # Progressive delivery settings
      progressDeadlineSeconds = 600
      
      # HPA reference
      autoscalerRef = {
        apiVersion = "autoscaling/v2"
        kind       = "HorizontalPodAutoscaler"
        name       = "api-gateway"
      }
      
      service = {
        # Service port
        port = 4000
        targetPort = 4000
        # Istio traffic policy
        trafficPolicy = {
          tls = {
            mode = "ISTIO_MUTUAL"
          }
        }
        # Istio gateway
        gateways = ["footanalytics-gateway.istio-system.svc.cluster.local"]
        hosts = ["api.footanalytics.com"]
      }
      
      # Canary analysis
      analysis = {
        # Schedule interval
        interval = "1m"
        # Max number of failed metric checks before rollback
        threshold = 5
        # Max traffic percentage routed to canary
        maxWeight = 50
        # Canary increment step
        stepWeight = 10
        # Prometheus checks
        metrics = [
          {
            name = "request-success-rate"
            # Minimum req success rate (non 5xx responses)
            thresholdRange = {
              min = 99
            }
            interval = "1m"
          },
          {
            name = "request-duration"
            # Maximum req duration P99
            thresholdRange = {
              max = 500
            }
            interval = "30s"
          }
        ]
        # Testing (optional)
        webhooks = [
          {
            name = "acceptance-test"
            type = "pre-rollout"
            url  = "http://flagger-loadtester.test/api/v1/canary"
            timeout = "30s"
            metadata = {
              type = "bash"
              cmd  = "curl -sd 'test' http://api-gateway-canary.footanalytics:4000/health | grep OK"
            }
          },
          {
            name = "load-test"
            url  = "http://flagger-loadtester.test/api/v1/canary"
            timeout = "5s"
            metadata = {
              cmd = "hey -z 1m -q 10 -c 2 http://api-gateway-canary.footanalytics:4000/graphql"
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.flagger]
}

# Canary configuration for ML Pipeline
resource "kubernetes_manifest" "ml_pipeline_canary" {
  manifest = {
    apiVersion = "flagger.app/v1beta1"
    kind       = "Canary"
    metadata = {
      name      = "ml-pipeline"
      namespace = "ai-processing"
      labels = {
        "app.kubernetes.io/name" = "ml-pipeline"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "ml-pipeline"
      }
      
      progressDeadlineSeconds = 600
      
      service = {
        port = 8000
        targetPort = 8000
        trafficPolicy = {
          tls = {
            mode = "ISTIO_MUTUAL"
          }
        }
      }
      
      analysis = {
        interval = "2m"
        threshold = 3
        maxWeight = 30
        stepWeight = 10
        metrics = [
          {
            name = "request-success-rate"
            thresholdRange = {
              min = 95
            }
            interval = "1m"
          },
          {
            name = "gpu-utilization"
            thresholdRange = {
              min = 60
              max = 90
            }
            interval = "1m"
          },
          {
            name = "inference-latency"
            thresholdRange = {
              max = 2000
            }
            interval = "30s"
          }
        ]
        webhooks = [
          {
            name = "ml-model-validation"
            type = "pre-rollout"
            url  = "http://flagger-loadtester.test/api/v1/canary"
            timeout = "60s"
            metadata = {
              type = "bash"
              cmd  = "python /scripts/validate_ml_model.py --endpoint http://ml-pipeline-canary.ai-processing:8000"
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.flagger]
}

# Load tester for canary analysis
resource "helm_release" "flagger_loadtester" {
  name       = "flagger-loadtester"
  repository = "https://flagger.app"
  chart      = "loadtester"
  version    = "0.27.0"
  namespace  = "test"
  create_namespace = true

  set {
    name  = "cmd.timeout"
    value = "1h"
  }

  depends_on = [helm_release.flagger]
}

# Alert Manager configuration for Flagger
resource "kubernetes_config_map" "flagger_alerts" {
  metadata {
    name      = "flagger-alerts"
    namespace = "monitoring"
    labels = {
      "prometheus-alert" = "true"
      "app.kubernetes.io/name" = "flagger"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  data = {
    "flagger-alerts.yaml" = file("${path.module}/alerts/flagger-alerts.yaml")
  }

  depends_on = [helm_release.flagger]
}

# ServiceMonitor for Prometheus integration
resource "kubernetes_manifest" "flagger_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "flagger"
      namespace = "monitoring"
      labels = {
        "app.kubernetes.io/name" = "flagger"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          "app.kubernetes.io/name" = "flagger"
        }
      }
      namespaceSelector = {
        matchNames = [kubernetes_namespace.flagger.metadata[0].name]
      }
      endpoints = [
        {
          port = "http"
          path = "/metrics"
          interval = "15s"
        }
      ]
    }
  }

  depends_on = [helm_release.flagger]
}

# Network Policy for Flagger
resource "kubernetes_network_policy" "flagger" {
  metadata {
    name      = "flagger-network-policy"
    namespace = kubernetes_namespace.flagger.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        "app.kubernetes.io/name" = "flagger"
      }
    }

    policy_types = ["Ingress", "Egress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "monitoring"
          }
        }
      }
      ports {
        protocol = "TCP"
        port     = "8080"
      }
    }

    egress {
      to {
        namespace_selector {
          match_labels = {
            name = "footanalytics"
          }
        }
      }
      to {
        namespace_selector {
          match_labels = {
            name = "ai-processing"
          }
        }
      }
      to {
        namespace_selector {
          match_labels = {
            name = "istio-system"
          }
        }
      }
    }
  }

  depends_on = [kubernetes_namespace.flagger]
}
