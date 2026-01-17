locals {
  # API services to enable
  enabled_services = [
    "firestore.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "identitytoolkit.googleapis.com",
  ]

  # Bucket names
  imports_bucket_name = "${var.project_id}-${var.imports_bucket_suffix}"

  # Artifact Registry repository
  artifact_registry_repo = "spendabo"

  # Secret names
  secrets = {
    jwt_audience = "jwt-audience"
  }

  # Cloud Run runtime service account
  runtime_sa_name = "${var.service_name}-runtime"
}
