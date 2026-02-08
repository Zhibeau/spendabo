# Enable required GCP APIs
resource "google_project_service" "enabled_services" {
  for_each = toset(local.enabled_services)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# Firestore Database (Native mode)
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.enabled_services]
}

# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = local.artifact_registry_repo
  description   = "Docker repository for Spendabo services"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled_services]
}

# Cloud Storage bucket for CSV/file imports
resource "google_storage_bucket" "imports" {
  project  = var.project_id
  name     = local.imports_bucket_name
  location = var.region

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90 # Delete files older than 90 days
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.enabled_services]
}

# Secret Manager secrets
resource "google_secret_manager_secret" "jwt_audience" {
  project   = var.project_id
  secret_id = local.secrets.jwt_audience

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled_services]
}

# Placeholder secret version for JWT audience
resource "google_secret_manager_secret_version" "jwt_audience_version" {
  secret = google_secret_manager_secret.jwt_audience.id

  # This is a placeholder; update with actual value after initial deployment
  secret_data = var.project_id
}

# Service Account for Cloud Run runtime
resource "google_service_account" "cloudrun_runtime" {
  project      = var.project_id
  account_id   = local.runtime_sa_name
  display_name = "Cloud Run Runtime SA for ${var.service_name}"
  description  = "Service account used by Cloud Run service at runtime"

  depends_on = [google_project_service.enabled_services]
}

# Grant Cloud Run runtime SA access to Firestore
resource "google_project_iam_member" "cloudrun_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloudrun_runtime.email}"
}

# Grant Cloud Run runtime SA access to read imports bucket
resource "google_storage_bucket_iam_member" "cloudrun_imports_reader" {
  bucket = google_storage_bucket.imports.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cloudrun_runtime.email}"
}

# Grant Cloud Run runtime SA access to read secrets
resource "google_secret_manager_secret_iam_member" "cloudrun_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_audience.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_runtime.email}"
}

# Grant Cloud Run runtime SA access to Vertex AI (for Gemini LLM)
resource "google_project_iam_member" "cloudrun_vertexai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloudrun_runtime.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # Traffic controlled by IAM, not network

  template {
    service_account = google_service_account.cloudrun_runtime.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCP_REGION"
        value = var.region
      }

      env {
        name = "JWT_AUDIENCE_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_audience.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.frontend_url != "" ? [var.frontend_url] : []
        content {
          name  = "CORS_ALLOWED_ORIGIN"
          value = env.value
        }
      }

      # Healthcheck endpoint
      startup_probe {
        http_get {
          path = "/healthz"
        }
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 3
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/healthz"
        }
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [
    google_project_service.enabled_services,
    google_artifact_registry_repository.docker_repo,
  ]
}

# IAM policy for Cloud Run (private service - require authentication)
# By default, with no IAM bindings for allUsers or allAuthenticatedUsers,
# the service is private and requires explicit IAM grants
resource "google_cloud_run_v2_service_iam_member" "invokers" {
  for_each = toset(var.allowed_invokers)

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = each.value
}

# Note: No public invoker role is granted (no allUsers or allAuthenticatedUsers)
# This ensures the Cloud Run service remains private
