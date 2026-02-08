variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region for resources"
  type        = string
  default     = "northamerica-northeast1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "spendabo-api"
}

variable "imports_bucket_suffix" {
  description = "Suffix for the imports bucket (full name will be project_id-suffix)"
  type        = string
  default     = "imports"
}

variable "container_image" {
  description = "Container image to deploy (will be built by CI/CD)"
  type        = string
  default     = "gcr.io/cloudrun/hello" # Placeholder; CI/CD will override
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run service"
  type        = string
  default     = "1000m"
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "allowed_invokers" {
  description = "List of members allowed to invoke the Cloud Run service (empty = only authenticated users)"
  type        = list(string)
  default     = []
}

variable "frontend_url" {
  description = "Frontend URL for CORS (e.g. https://spendabo.example.com)"
  type        = string
  default     = ""
}
