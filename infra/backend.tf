terraform {
  backend "gcs" {
    # Bucket name is configured via -backend-config or environment variable
    # Run: terraform init -backend-config="bucket=YOUR_PROJECT_ID-tfstate"
    # Or set in GitHub Actions workflow
    prefix = "terraform/state"
  }
}
