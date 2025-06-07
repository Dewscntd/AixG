variable "domain" {
  description = "Domain name for ArgoCD server"
  type        = string
  default     = "argocd.footanalytics.local"
}

variable "ingress_class" {
  description = "Ingress class for ArgoCD server"
  type        = string
  default     = "nginx"
}

variable "tls_secret_name" {
  description = "TLS secret name for ArgoCD server"
  type        = string
  default     = "argocd-server-tls"
}

variable "admin_password" {
  description = "Admin password for ArgoCD"
  type        = string
  sensitive   = true
}

variable "git_repo_url" {
  description = "Git repository URL for GitOps"
  type        = string
}

variable "admin_group" {
  description = "Admin group for ArgoCD RBAC"
  type        = string
  default     = "footanalytics:admin"
}

variable "developer_group" {
  description = "Developer group for ArgoCD RBAC"
  type        = string
  default     = "footanalytics:developer"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "teams_webhook_url" {
  description = "Microsoft Teams webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}
