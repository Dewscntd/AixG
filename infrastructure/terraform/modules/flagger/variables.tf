variable "prometheus_url" {
  description = "Prometheus server URL for metrics collection"
  type        = string
  default     = "http://prometheus-server.monitoring:80"
}

variable "grafana_url" {
  description = "Grafana URL for dashboard integration"
  type        = string
  default     = "http://grafana.monitoring:80"
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

variable "canary_analysis_interval" {
  description = "Interval for canary analysis checks"
  type        = string
  default     = "1m"
}

variable "canary_threshold" {
  description = "Number of failed checks before rollback"
  type        = number
  default     = 5
}

variable "max_canary_weight" {
  description = "Maximum traffic percentage for canary"
  type        = number
  default     = 50
}

variable "canary_step_weight" {
  description = "Traffic increment step for canary"
  type        = number
  default     = 10
}
