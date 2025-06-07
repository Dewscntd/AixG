# ArgoCD GitOps Module for FootAnalytics
# Provides zero-downtime deployments with GitOps workflow

resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      "app.kubernetes.io/name" = "argocd"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }
}

# ArgoCD Helm Chart Installation
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "5.51.6"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  values = [
    templatefile("${path.module}/values.yaml", {
      domain = var.domain
      ingress_class = var.ingress_class
      tls_secret_name = var.tls_secret_name
    })
  ]

  set {
    name  = "server.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "server.extraArgs"
    value = "{--insecure}"
  }

  set {
    name  = "configs.secret.argocdServerAdminPassword"
    value = bcrypt(var.admin_password)
  }

  depends_on = [kubernetes_namespace.argocd]
}

# ArgoCD Application for FootAnalytics Platform
resource "kubernetes_manifest" "footanalytics_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "footanalytics-platform"
      namespace = kubernetes_namespace.argocd.metadata[0].name
      labels = {
        "app.kubernetes.io/name" = "footanalytics"
        "app.kubernetes.io/part-of" = "footanalytics-platform"
      }
      finalizers = ["resources-finalizer.argocd.argoproj.io"]
    }
    spec = {
      project = "default"
      source = {
        repoURL        = var.git_repo_url
        targetRevision = "HEAD"
        path           = "infrastructure/k8s/overlays/production"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "footanalytics"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        syncOptions = [
          "CreateNamespace=true",
          "PrunePropagationPolicy=foreground",
          "PruneLast=true"
        ]
        retry = {
          limit = 5
          backoff = {
            duration    = "5s"
            factor      = 2
            maxDuration = "3m"
          }
        }
      }
    }
  }

  depends_on = [helm_release.argocd]
}

# ArgoCD Application for ML Pipeline
resource "kubernetes_manifest" "ml_pipeline_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "ml-pipeline"
      namespace = kubernetes_namespace.argocd.metadata[0].name
      labels = {
        "app.kubernetes.io/name" = "ml-pipeline"
        "app.kubernetes.io/part-of" = "footanalytics-platform"
      }
      finalizers = ["resources-finalizer.argocd.argoproj.io"]
    }
    spec = {
      project = "default"
      source = {
        repoURL        = var.git_repo_url
        targetRevision = "HEAD"
        path           = "infrastructure/k8s/ml-pipeline"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "ai-processing"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        syncOptions = [
          "CreateNamespace=true",
          "PrunePropagationPolicy=foreground"
        ]
        retry = {
          limit = 3
          backoff = {
            duration    = "5s"
            factor      = 2
            maxDuration = "2m"
          }
        }
      }
    }
  }

  depends_on = [helm_release.argocd]
}

# ArgoCD Project for FootAnalytics
resource "kubernetes_manifest" "footanalytics_project" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AppProject"
    metadata = {
      name      = "footanalytics"
      namespace = kubernetes_namespace.argocd.metadata[0].name
    }
    spec = {
      description = "FootAnalytics AI Platform Project"
      sourceRepos = [
        var.git_repo_url,
        "https://charts.helm.sh/stable",
        "https://prometheus-community.github.io/helm-charts"
      ]
      destinations = [
        {
          namespace = "footanalytics"
          server    = "https://kubernetes.default.svc"
        },
        {
          namespace = "ai-processing"
          server    = "https://kubernetes.default.svc"
        },
        {
          namespace = "monitoring"
          server    = "https://kubernetes.default.svc"
        }
      ]
      clusterResourceWhitelist = [
        {
          group = ""
          kind  = "Namespace"
        },
        {
          group = "rbac.authorization.k8s.io"
          kind  = "*"
        }
      ]
      namespaceResourceWhitelist = [
        {
          group = "*"
          kind  = "*"
        }
      ]
      roles = [
        {
          name = "admin"
          policies = [
            "p, proj:footanalytics:admin, applications, *, footanalytics/*, allow",
            "p, proj:footanalytics:admin, repositories, *, *, allow"
          ]
          groups = [var.admin_group]
        },
        {
          name = "developer"
          policies = [
            "p, proj:footanalytics:developer, applications, get, footanalytics/*, allow",
            "p, proj:footanalytics:developer, applications, sync, footanalytics/*, allow"
          ]
          groups = [var.developer_group]
        }
      ]
    }
  }

  depends_on = [helm_release.argocd]
}

# ArgoCD Notifications Configuration
resource "kubernetes_config_map" "argocd_notifications" {
  metadata {
    name      = "argocd-notifications-cm"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "app.kubernetes.io/name" = "argocd-notifications"
      "app.kubernetes.io/part-of" = "argocd"
    }
  }

  data = {
    "config.yaml" = templatefile("${path.module}/notifications-config.yaml", {
      slack_webhook_url = var.slack_webhook_url
      teams_webhook_url = var.teams_webhook_url
    })
  }

  depends_on = [helm_release.argocd]
}

# ArgoCD Image Updater for automated image updates
resource "helm_release" "argocd_image_updater" {
  name       = "argocd-image-updater"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-image-updater"
  version    = "0.9.1"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  set {
    name  = "config.argocd.serverAddr"
    value = "argocd-server.argocd.svc.cluster.local:80"
  }

  set {
    name  = "config.argocd.insecure"
    value = "true"
  }

  depends_on = [helm_release.argocd]
}
