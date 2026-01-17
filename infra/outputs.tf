output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "cloudrun_service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.api.name
}

output "cloudrun_service_url" {
  description = "Cloud Run service URL (private - requires authentication)"
  value       = google_cloud_run_v2_service.api.uri
}

output "cloudrun_service_account" {
  description = "Cloud Run runtime service account email"
  value       = google_service_account.cloudrun_runtime.email
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${local.artifact_registry_repo}"
}

output "imports_bucket_name" {
  description = "GCS bucket for imports"
  value       = google_storage_bucket.imports.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}

output "secrets" {
  description = "Secret Manager secret names"
  value = {
    jwt_audience = google_secret_manager_secret.jwt_audience.secret_id
  }
  sensitive = false
}

output "deployment_notes" {
  description = "Important notes for deployment"
  value       = <<-EOT
    Cloud Run Service: ${google_cloud_run_v2_service.api.uri}

    IMPORTANT:
    - Service is PRIVATE (no public access)
    - Requires authentication via Identity Platform JWT
    - To invoke from client app, users must authenticate and include JWT in Authorization header
    - For testing with curl, use: gcloud auth print-identity-token

    To deploy a new image:
    1. Build: docker build -t ${var.region}-docker.pkg.dev/${var.project_id}/${local.artifact_registry_repo}/api:latest .
    2. Push: docker push ${var.region}-docker.pkg.dev/${var.project_id}/${local.artifact_registry_repo}/api:latest
    3. Update Terraform var 'container_image' and apply

    Identity Platform Setup (Manual):
    - Enable Identity Platform in GCP Console
    - Configure Email/Password and Google sign-in providers
    - Update jwt_audience secret with your project's audience
  EOT
}
