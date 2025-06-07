# Jaeger Distributed Tracing Module for FootAnalytics
# Provides comprehensive distributed tracing across all microservices

resource "kubernetes_namespace" "jaeger" {
  metadata {
    name = "jaeger"
    labels = {
      "app.kubernetes.io/name" = "jaeger"
      "app.kubernetes.io/part-of" = "footanalytics"
      "istio-injection" = "enabled"
    }
  }
}

# Jaeger Operator Installation
resource "helm_release" "jaeger_operator" {
  name       = "jaeger-operator"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger-operator"
  version    = "2.49.0"
  namespace  = kubernetes_namespace.jaeger.metadata[0].name

  set {
    name  = "jaeger.create"
    value = "false"
  }

  set {
    name  = "rbac.clusterRole"
    value = "true"
  }

  depends_on = [kubernetes_namespace.jaeger]
}

# Jaeger Production Instance
resource "kubernetes_manifest" "jaeger_production" {
  manifest = {
    apiVersion = "jaegertracing.io/v1"
    kind       = "Jaeger"
    metadata = {
      name      = "jaeger-production"
      namespace = kubernetes_namespace.jaeger.metadata[0].name
      labels = {
        "app.kubernetes.io/name" = "jaeger"
        "app.kubernetes.io/instance" = "production"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      strategy = "production"
      
      # Storage configuration using Elasticsearch
      storage = {
        type = "elasticsearch"
        options = {
          es = {
            "server-urls" = "http://elasticsearch.jaeger:9200"
            "index-prefix" = "jaeger"
            "num-shards" = "3"
            "num-replicas" = "1"
          }
        }
      }
      
      # Collector configuration
      collector = {
        replicas = 3
        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }
        options = {
          "collector.queue-size" = "2000"
          "collector.num-workers" = "50"
        }
      }
      
      # Query service configuration
      query = {
        replicas = 2
        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }
        options = {
          "query.max-clock-skew-adjustment" = "0s"
        }
      }
      
      # Agent configuration (deprecated but still supported)
      agent = {
        strategy = "DaemonSet"
        resources = {
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }
      }
      
      # Ingress configuration
      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class" = "nginx"
          "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
          "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
        }
        hosts = [
          {
            host = var.jaeger_domain
            paths = [
              {
                path = "/"
                pathType = "Prefix"
              }
            ]
          }
        ]
        tls = [
          {
            secretName = "jaeger-tls"
            hosts = [var.jaeger_domain]
          }
        ]
      }
    }
  }

  depends_on = [
    helm_release.jaeger_operator,
    helm_release.elasticsearch
  ]
}

# Elasticsearch for Jaeger storage
resource "helm_release" "elasticsearch" {
  name       = "elasticsearch"
  repository = "https://helm.elastic.co"
  chart      = "elasticsearch"
  version    = "8.5.1"
  namespace  = kubernetes_namespace.jaeger.metadata[0].name

  values = [
    templatefile("${path.module}/elasticsearch-values.yaml", {
      storage_class = var.storage_class
      storage_size  = var.elasticsearch_storage_size
    })
  ]

  set {
    name  = "replicas"
    value = "3"
  }

  set {
    name  = "minimumMasterNodes"
    value = "2"
  }

  depends_on = [kubernetes_namespace.jaeger]
}

# OpenTelemetry Collector for enhanced trace collection
resource "helm_release" "otel_collector" {
  name       = "opentelemetry-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.70.0"
  namespace  = kubernetes_namespace.jaeger.metadata[0].name

  values = [
    templatefile("${path.module}/otel-collector-values.yaml", {
      jaeger_endpoint = "jaeger-production-collector.jaeger:14250"
    })
  ]

  depends_on = [kubernetes_manifest.jaeger_production]
}

# ServiceMonitor for Prometheus integration
resource "kubernetes_manifest" "jaeger_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "jaeger"
      namespace = "monitoring"
      labels = {
        "app.kubernetes.io/name" = "jaeger"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          "app.kubernetes.io/name" = "jaeger"
        }
      }
      namespaceSelector = {
        matchNames = [kubernetes_namespace.jaeger.metadata[0].name]
      }
      endpoints = [
        {
          port = "admin-http"
          path = "/metrics"
          interval = "30s"
        }
      ]
    }
  }

  depends_on = [kubernetes_manifest.jaeger_production]
}

# Grafana Dashboard ConfigMap for Jaeger
resource "kubernetes_config_map" "jaeger_dashboard" {
  metadata {
    name      = "jaeger-dashboard"
    namespace = "monitoring"
    labels = {
      "grafana_dashboard" = "1"
      "app.kubernetes.io/name" = "jaeger"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  data = {
    "jaeger-dashboard.json" = file("${path.module}/dashboards/jaeger-dashboard.json")
  }

  depends_on = [kubernetes_manifest.jaeger_production]
}

# Network Policy for Jaeger
resource "kubernetes_network_policy" "jaeger" {
  metadata {
    name      = "jaeger-network-policy"
    namespace = kubernetes_namespace.jaeger.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        "app.kubernetes.io/name" = "jaeger"
      }
    }

    policy_types = ["Ingress", "Egress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "footanalytics"
          }
        }
      }
      from {
        namespace_selector {
          match_labels = {
            name = "ai-processing"
          }
        }
      }
      from {
        namespace_selector {
          match_labels = {
            name = "monitoring"
          }
        }
      }
      ports {
        protocol = "TCP"
        port     = "14250"
      }
      ports {
        protocol = "TCP"
        port     = "16686"
      }
    }

    egress {
      to {
        namespace_selector {
          match_labels = {
            name = kubernetes_namespace.jaeger.metadata[0].name
          }
        }
      }
      ports {
        protocol = "TCP"
        port     = "9200"
      }
    }
  }

  depends_on = [kubernetes_namespace.jaeger]
}
