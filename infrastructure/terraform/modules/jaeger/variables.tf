variable "jaeger_domain" {
  description = "Domain name for Jaeger UI"
  type        = string
  default     = "jaeger.footanalytics.local"
}

variable "storage_class" {
  description = "Storage class for Elasticsearch persistent volumes"
  type        = string
  default     = "gp2"
}

variable "elasticsearch_storage_size" {
  description = "Storage size for Elasticsearch"
  type        = string
  default     = "100Gi"
}

variable "retention_days" {
  description = "Trace retention period in days"
  type        = number
  default     = 7
}

variable "sampling_rate" {
  description = "Trace sampling rate (0.0 to 1.0)"
  type        = number
  default     = 0.1
}

variable "max_traces" {
  description = "Maximum number of traces to store"
  type        = number
  default     = 1000000
}
