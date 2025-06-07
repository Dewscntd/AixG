variable "flagsmith_domain" {
  description = "Domain name for Flagsmith UI"
  type        = string
  default     = "flags.footanalytics.local"
}

variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = "gp2"
}

variable "postgres_storage_size" {
  description = "Storage size for PostgreSQL"
  type        = string
  default     = "20Gi"
}

variable "postgres_password" {
  description = "PostgreSQL password for Flagsmith"
  type        = string
  sensitive   = true
}

variable "django_secret_key" {
  description = "Django secret key for Flagsmith"
  type        = string
  sensitive   = true
}

variable "admin_username" {
  description = "Admin username for Flagsmith"
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Admin password for Flagsmith"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Admin email for Flagsmith"
  type        = string
  default     = "admin@footanalytics.com"
}
