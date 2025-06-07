# Feature Flags Module for FootAnalytics
# Provides feature flag management with Flagsmith

resource "kubernetes_namespace" "feature_flags" {
  metadata {
    name = "feature-flags"
    labels = {
      "app.kubernetes.io/name" = "flagsmith"
      "app.kubernetes.io/part-of" = "footanalytics"
      "istio-injection" = "enabled"
    }
  }
}

# PostgreSQL for Flagsmith
resource "helm_release" "flagsmith_postgres" {
  name       = "flagsmith-postgres"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "12.12.10"
  namespace  = kubernetes_namespace.feature_flags.metadata[0].name

  values = [
    templatefile("${path.module}/postgres-values.yaml", {
      storage_class = var.storage_class
      storage_size  = var.postgres_storage_size
    })
  ]

  set_sensitive {
    name  = "auth.postgresPassword"
    value = var.postgres_password
  }

  set {
    name  = "auth.database"
    value = "flagsmith"
  }

  depends_on = [kubernetes_namespace.feature_flags]
}

# Redis for Flagsmith caching
resource "helm_release" "flagsmith_redis" {
  name       = "flagsmith-redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.4.0"
  namespace  = kubernetes_namespace.feature_flags.metadata[0].name

  set {
    name  = "architecture"
    value = "standalone"
  }

  set {
    name  = "auth.enabled"
    value = "false"
  }

  set {
    name  = "master.persistence.enabled"
    value = "true"
  }

  set {
    name  = "master.persistence.size"
    value = "8Gi"
  }

  depends_on = [kubernetes_namespace.feature_flags]
}

# Flagsmith Deployment
resource "kubernetes_deployment" "flagsmith" {
  metadata {
    name      = "flagsmith"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
    labels = {
      "app.kubernetes.io/name" = "flagsmith"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        "app.kubernetes.io/name" = "flagsmith"
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = "flagsmith"
          "app.kubernetes.io/part-of" = "footanalytics"
        }
        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8000"
          "prometheus.io/path"   = "/health"
        }
      }

      spec {
        container {
          name  = "flagsmith"
          image = "flagsmith/flagsmith:2.77.0"

          port {
            container_port = 8000
            name          = "http"
          }

          env {
            name  = "DJANGO_ALLOWED_HOSTS"
            value = "*"
          }

          env {
            name  = "DATABASE_URL"
            value = "postgresql://postgres:${var.postgres_password}@flagsmith-postgres:5432/flagsmith"
          }

          env {
            name  = "CACHE_LOCATION"
            value = "flagsmith-redis-master:6379"
          }

          env {
            name  = "USE_POSTGRES_FOR_ANALYTICS"
            value = "True"
          }

          env {
            name  = "DJANGO_SECRET_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.flagsmith_secret.metadata[0].name
                key  = "django-secret-key"
              }
            }
          }

          env {
            name  = "ENABLE_ADMIN_ACCESS_USER_PASS"
            value = "True"
          }

          env {
            name  = "ADMIN_USERNAME"
            value = var.admin_username
          }

          env {
            name  = "ADMIN_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.flagsmith_secret.metadata[0].name
                key  = "admin-password"
              }
            }
          }

          env {
            name  = "ADMIN_EMAIL"
            value = var.admin_email
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8000
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 8000
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }

        restart_policy = "Always"
      }
    }
  }

  depends_on = [
    helm_release.flagsmith_postgres,
    helm_release.flagsmith_redis,
    kubernetes_secret.flagsmith_secret
  ]
}

# Flagsmith Secret
resource "kubernetes_secret" "flagsmith_secret" {
  metadata {
    name      = "flagsmith-secret"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
  }

  data = {
    "django-secret-key" = base64encode(var.django_secret_key)
    "admin-password"    = base64encode(var.admin_password)
  }

  type = "Opaque"

  depends_on = [kubernetes_namespace.feature_flags]
}

# Flagsmith Service
resource "kubernetes_service" "flagsmith" {
  metadata {
    name      = "flagsmith"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
    labels = {
      "app.kubernetes.io/name" = "flagsmith"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  spec {
    selector = {
      "app.kubernetes.io/name" = "flagsmith"
    }

    port {
      name        = "http"
      port        = 8000
      target_port = 8000
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_deployment.flagsmith]
}

# Flagsmith Ingress
resource "kubernetes_ingress_v1" "flagsmith" {
  metadata {
    name      = "flagsmith"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"  = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size" = "10m"
    }
  }

  spec {
    tls {
      hosts       = [var.flagsmith_domain]
      secret_name = "flagsmith-tls"
    }

    rule {
      host = var.flagsmith_domain
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.flagsmith.metadata[0].name
              port {
                number = 8000
              }
            }
          }
        }
      }
    }
  }

  depends_on = [kubernetes_service.flagsmith]
}

# ServiceMonitor for Prometheus integration
resource "kubernetes_manifest" "flagsmith_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "flagsmith"
      namespace = "monitoring"
      labels = {
        "app.kubernetes.io/name" = "flagsmith"
        "app.kubernetes.io/part-of" = "footanalytics"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          "app.kubernetes.io/name" = "flagsmith"
        }
      }
      namespaceSelector = {
        matchNames = [kubernetes_namespace.feature_flags.metadata[0].name]
      }
      endpoints = [
        {
          port = "http"
          path = "/health"
          interval = "30s"
        }
      ]
    }
  }

  depends_on = [kubernetes_service.flagsmith]
}

# HorizontalPodAutoscaler for Flagsmith
resource "kubernetes_horizontal_pod_autoscaler_v2" "flagsmith" {
  metadata {
    name      = "flagsmith"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.flagsmith.metadata[0].name
    }

    min_replicas = 2
    max_replicas = 10

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
  }

  depends_on = [kubernetes_deployment.flagsmith]
}
