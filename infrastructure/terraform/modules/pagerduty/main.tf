# PagerDuty Incident Response Module for FootAnalytics
# Provides automated incident response and escalation

# PagerDuty Service for FootAnalytics Platform
resource "pagerduty_service" "footanalytics_platform" {
  name                    = "FootAnalytics Platform"
  description            = "AI-powered video analysis platform for Israeli football clubs"
  auto_resolve_timeout   = 14400  # 4 hours
  acknowledgement_timeout = 600   # 10 minutes
  escalation_policy      = pagerduty_escalation_policy.footanalytics.id
  alert_creation         = "create_alerts_and_incidents"

  incident_urgency_rule {
    type = "constant"
    constant_urgency = "high"
  }

  auto_pause_notifications_parameters {
    enabled = true
    timeout = 300  # 5 minutes
  }
}

# PagerDuty Service for ML Pipeline
resource "pagerduty_service" "ml_pipeline" {
  name                    = "FootAnalytics ML Pipeline"
  description            = "Machine learning video processing pipeline"
  auto_resolve_timeout   = 7200   # 2 hours
  acknowledgement_timeout = 300   # 5 minutes
  escalation_policy      = pagerduty_escalation_policy.ml_pipeline.id
  alert_creation         = "create_alerts_and_incidents"

  incident_urgency_rule {
    type = "constant"
    constant_urgency = "high"
  }
}

# PagerDuty Service for Infrastructure
resource "pagerduty_service" "infrastructure" {
  name                    = "FootAnalytics Infrastructure"
  description            = "Kubernetes cluster and infrastructure components"
  auto_resolve_timeout   = 3600   # 1 hour
  acknowledgement_timeout = 180   # 3 minutes
  escalation_policy      = pagerduty_escalation_policy.infrastructure.id
  alert_creation         = "create_alerts_and_incidents"

  incident_urgency_rule {
    type = "constant"
    constant_urgency = "high"
  }
}

# Escalation Policy for Platform
resource "pagerduty_escalation_policy" "footanalytics" {
  name      = "FootAnalytics Platform Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user"
      id   = pagerduty_user.platform_engineer.id
    }
  }

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user"
      id   = pagerduty_user.tech_lead.id
    }
  }

  rule {
    escalation_delay_in_minutes = 30
    target {
      type = "user"
      id   = pagerduty_user.cto.id
    }
  }
}

# Escalation Policy for ML Pipeline
resource "pagerduty_escalation_policy" "ml_pipeline" {
  name      = "ML Pipeline Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "user"
      id   = pagerduty_user.ml_engineer.id
    }
  }

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user"
      id   = pagerduty_user.platform_engineer.id
    }
  }

  rule {
    escalation_delay_in_minutes = 20
    target {
      type = "user"
      id   = pagerduty_user.tech_lead.id
    }
  }
}

# Escalation Policy for Infrastructure
resource "pagerduty_escalation_policy" "infrastructure" {
  name      = "Infrastructure Escalation"
  num_loops = 3

  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "user"
      id   = pagerduty_user.devops_engineer.id
    }
  }

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user"
      id   = pagerduty_user.platform_engineer.id
    }
  }

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user"
      id   = pagerduty_user.tech_lead.id
    }
  }
}

# PagerDuty Users
resource "pagerduty_user" "platform_engineer" {
  name  = var.platform_engineer_name
  email = var.platform_engineer_email
  role  = "user"
}

resource "pagerduty_user" "ml_engineer" {
  name  = var.ml_engineer_name
  email = var.ml_engineer_email
  role  = "user"
}

resource "pagerduty_user" "devops_engineer" {
  name  = var.devops_engineer_name
  email = var.devops_engineer_email
  role  = "user"
}

resource "pagerduty_user" "tech_lead" {
  name  = var.tech_lead_name
  email = var.tech_lead_email
  role  = "admin"
}

resource "pagerduty_user" "cto" {
  name  = var.cto_name
  email = var.cto_email
  role  = "admin"
}

# PagerDuty Team
resource "pagerduty_team" "footanalytics" {
  name        = "FootAnalytics Engineering"
  description = "Engineering team responsible for FootAnalytics platform"
}

# Team Memberships
resource "pagerduty_team_membership" "platform_engineer" {
  user_id = pagerduty_user.platform_engineer.id
  team_id = pagerduty_team.footanalytics.id
  role    = "manager"
}

resource "pagerduty_team_membership" "ml_engineer" {
  user_id = pagerduty_user.ml_engineer.id
  team_id = pagerduty_team.footanalytics.id
  role    = "responder"
}

resource "pagerduty_team_membership" "devops_engineer" {
  user_id = pagerduty_user.devops_engineer.id
  team_id = pagerduty_team.footanalytics.id
  role    = "responder"
}

resource "pagerduty_team_membership" "tech_lead" {
  user_id = pagerduty_user.tech_lead.id
  team_id = pagerduty_team.footanalytics.id
  role    = "manager"
}

# Business Services
resource "pagerduty_business_service" "footanalytics_platform" {
  name        = "FootAnalytics Platform"
  description = "Core platform business service"
  type        = "business_service"
}

# Service Dependencies
resource "pagerduty_service_dependency" "platform_ml_dependency" {
  dependency {
    dependent_service {
      id   = pagerduty_service.footanalytics_platform.id
      type = "service"
    }
    supporting_service {
      id   = pagerduty_service.ml_pipeline.id
      type = "service"
    }
  }
}

resource "pagerduty_service_dependency" "platform_infrastructure_dependency" {
  dependency {
    dependent_service {
      id   = pagerduty_service.footanalytics_platform.id
      type = "service"
    }
    supporting_service {
      id   = pagerduty_service.infrastructure.id
      type = "service"
    }
  }
}

# Kubernetes Secret for PagerDuty Integration Key
resource "kubernetes_secret" "pagerduty_integration" {
  metadata {
    name      = "pagerduty-integration"
    namespace = "monitoring"
    labels = {
      "app.kubernetes.io/name" = "pagerduty"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  data = {
    "platform-integration-key"      = base64encode(pagerduty_service.footanalytics_platform.integration[0].integration_key)
    "ml-pipeline-integration-key"   = base64encode(pagerduty_service.ml_pipeline.integration[0].integration_key)
    "infrastructure-integration-key" = base64encode(pagerduty_service.infrastructure.integration[0].integration_key)
  }

  type = "Opaque"
}

# Alertmanager Configuration for PagerDuty
resource "kubernetes_config_map" "pagerduty_alertmanager_config" {
  metadata {
    name      = "pagerduty-alertmanager-config"
    namespace = "monitoring"
    labels = {
      "app.kubernetes.io/name" = "alertmanager"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  data = {
    "pagerduty-config.yaml" = templatefile("${path.module}/alertmanager-pagerduty-config.yaml", {
      platform_integration_key      = pagerduty_service.footanalytics_platform.integration[0].integration_key
      ml_pipeline_integration_key   = pagerduty_service.ml_pipeline.integration[0].integration_key
      infrastructure_integration_key = pagerduty_service.infrastructure.integration[0].integration_key
    })
  }
}

# Runbook Automation ConfigMap
resource "kubernetes_config_map" "incident_runbooks" {
  metadata {
    name      = "incident-runbooks"
    namespace = "monitoring"
    labels = {
      "app.kubernetes.io/name" = "runbooks"
      "app.kubernetes.io/part-of" = "footanalytics"
    }
  }

  data = {
    "high-cpu-runbook.md"           = file("${path.module}/runbooks/high-cpu-runbook.md")
    "high-memory-runbook.md"        = file("${path.module}/runbooks/high-memory-runbook.md")
    "pod-crashloop-runbook.md"      = file("${path.module}/runbooks/pod-crashloop-runbook.md")
    "ml-inference-failure-runbook.md" = file("${path.module}/runbooks/ml-inference-failure-runbook.md")
    "database-connection-runbook.md" = file("${path.module}/runbooks/database-connection-runbook.md")
  }
}
