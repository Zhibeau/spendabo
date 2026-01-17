# Terraform Bootstrap

This directory contains the bootstrap configuration for Terraform remote state and GitHub Actions authentication.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Billing enabled on your GCP project
- Permissions to create projects, service accounts, and storage buckets

## Bootstrap Steps

### 1. Set Variables

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="northamerica-northeast1"
export GITHUB_REPO="your-repo-name"
export GITHUB_OWNER="your-github-id"
```

### 2. Run Bootstrap Terraform

This creates:
- GCS bucket for Terraform state
- Workload Identity Pool and Provider for GitHub Actions
- Service Account for Terraform deployments
- IAM bindings for GitHub Actions to impersonate the service account

```bash
cd infra/bootstrap

# Initialize Terraform (local state for bootstrap)
terraform init

# Review the plan
terraform plan \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="github_repo=${GITHUB_REPO}" \
  -var="github_owner=${GITHUB_OWNER}"

# Apply the bootstrap configuration
terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="github_repo=${GITHUB_REPO}" \
  -var="github_owner=${GITHUB_OWNER}"
```

### 3. Note the Outputs

After applying, you'll see outputs like:
```
terraform_state_bucket = "your-project-id-tfstate"
workload_identity_provider = "projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
terraform_service_account = "terraform-deployer@your-project-id.iam.gserviceaccount.com"
```

### 4. Configure GitHub Repository Variables

In your GitHub repository settings, add these variables:

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_REGION`: `northamerica-northeast1` (or your chosen region)
- `TF_STATE_BUCKET`: From terraform output `terraform_state_bucket`
- `WIF_PROVIDER`: From terraform output `workload_identity_provider`
- `WIF_SERVICE_ACCOUNT`: From terraform output `terraform_service_account`

### 5. Initialize Main Terraform

Now that the state bucket exists, initialize the main Terraform:

```bash
cd ../  # Back to /infra directory

# Copy the example tfvars
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
# vim terraform.tfvars

# Initialize with remote backend
terraform init

# The backend configuration will use the GCS bucket created by bootstrap
```

## Manual Steps for Identity Platform

Identity Platform requires some manual setup:

```bash
# Enable Identity Platform
gcloud identity platforms tenants describe default --project=${GCP_PROJECT_ID} \
  || gcloud identity platforms tenants create --project=${GCP_PROJECT_ID}

# Enable Email/Password provider
gcloud identity platforms providers create email \
  --project=${GCP_PROJECT_ID} \
  --enabled

# Enable Google provider (requires OAuth client setup in Google Cloud Console)
# 1. Go to: https://console.cloud.google.com/apis/credentials
# 2. Create OAuth 2.0 Client ID (Web application)
# 3. Note the Client ID and Client Secret
# 4. Run:
gcloud identity platforms providers create google \
  --project=${GCP_PROJECT_ID} \
  --enabled \
  --client-id="YOUR_OAUTH_CLIENT_ID" \
  --client-secret="YOUR_OAUTH_CLIENT_SECRET"
```

## Cleanup (Caution!)

To destroy the bootstrap resources (this will delete your Terraform state bucket):

```bash
cd infra/bootstrap
terraform destroy \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="github_repo=${GITHUB_REPO}"
```

⚠️ **Warning**: This will delete your Terraform state bucket. Make sure to destroy all resources managed by the main Terraform configuration first.
