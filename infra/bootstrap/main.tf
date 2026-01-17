terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Bootstrap uses local state
  # Once this runs, the main terraform config will use the created GCS bucket
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "northamerica-northeast1"
}

variable "github_owner" {
  description = "GitHub repository owner name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# GCS bucket for Terraform state
resource "google_storage_bucket" "terraform_state" {
  name     = "${var.project_id}-tfstate"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }

  force_destroy = false
}

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions OIDC"
}

# Workload Identity Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository_owner == 'Zhibeau'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service Account for Terraform deployments
resource "google_service_account" "terraform_deployer" {
  project      = var.project_id
  account_id   = "terraform-deployer"
  display_name = "Terraform Deployer"
  description  = "Service Account for GitHub Actions to deploy infrastructure"
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.terraform_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_owner}/${var.github_repo}"
}

# Grant necessary permissions to the Terraform deployer service account
resource "google_project_iam_member" "terraform_deployer_roles" {
  for_each = toset([
    "roles/editor",                    # Broad permissions for resource management
    "roles/iam.serviceAccountAdmin",   # Create and manage service accounts
    "roles/iam.securityAdmin",        # Manage IAM policies
    "roles/storage.admin",            # Manage GCS buckets
    "roles/secretmanager.admin",      # Manage secrets
    "roles/run.admin",                # Manage Cloud Run services
    "roles/artifactregistry.admin",   # Manage Artifact Registry
    "roles/serviceusage.serviceUsageAdmin", # Enable APIs
  ])

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.terraform_deployer.email}"
}

# Grant the service account access to the state bucket
resource "google_storage_bucket_iam_member" "terraform_state_admin" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_deployer.email}"
}

# Outputs for GitHub Actions configuration
output "terraform_state_bucket" {
  description = "GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.name
}

output "workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "terraform_service_account" {
  description = "Service Account email for Terraform deployments"
  value       = google_service_account.terraform_deployer.email
}

output "github_actions_setup_instructions" {
  description = "Instructions for configuring GitHub Actions"
  value       = <<-EOT
    Add these variables to your GitHub repository:

    Variables (Settings → Secrets and variables → Actions → Variables):
    - GCP_PROJECT_ID: ${var.project_id}
    - GCP_REGION: ${var.region}
    - TF_STATE_BUCKET: ${google_storage_bucket.terraform_state.name}
    - WIF_PROVIDER: ${google_iam_workload_identity_pool_provider.github_provider.name}
    - WIF_SERVICE_ACCOUNT: ${google_service_account.terraform_deployer.email}
  EOT
}
