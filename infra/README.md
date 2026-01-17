# Spendabo Infrastructure

Terraform configuration for provisioning GCP resources for the Spendabo application.

## Overview

This Terraform configuration provisions:
- **Firestore** (Native mode) for data storage
- **Cloud Run** service (private, authentication required)
- **Artifact Registry** for Docker images
- **Cloud Storage** bucket for file imports
- **Secret Manager** for sensitive configuration
- **IAM** service accounts and permissions
- **Identity Platform** (requires manual setup for providers)

## Prerequisites

1. **GCP Account & Project**
   - Active GCP project with billing enabled
   - Project ID ready

2. **Tools Installed**
   - Terraform >= 1.5
   - gcloud CLI
   - Docker (for building images)

3. **Permissions**
   - Owner or Editor role on the GCP project (for initial setup)
   - Or specific roles listed in bootstrap README

## Setup Instructions

### Step 1: Bootstrap (First Time Only)

The bootstrap process creates:
- GCS bucket for Terraform remote state
- Workload Identity Federation for GitHub Actions
- Service account for Terraform deployments

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="northamerica-northeast1"
export GITHUB_REPO="spendabo"

# Run bootstrap
cd bootstrap
terraform init
terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="github_repo=${GITHUB_REPO}"

# Note the outputs for GitHub Actions configuration
```

See [bootstrap/README.md](bootstrap/README.md) for detailed instructions.

### Step 2: Configure GitHub Actions

Add the following variables to your GitHub repository:

**Settings → Secrets and variables → Actions → Variables:**
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_REGION`: `northamerica-northeast1`
- `TF_STATE_BUCKET`: Output from bootstrap
- `WIF_PROVIDER`: Output from bootstrap
- `WIF_SERVICE_ACCOUNT`: Output from bootstrap

### Step 3: Configure Terraform Variables

```bash
# Copy example tfvars
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

Required variables in `terraform.tfvars`:
```hcl
project_id = "your-gcp-project-id"
region     = "northamerica-northeast1"
```

### Step 4: Initialize Terraform

```bash
# Initialize with remote backend
terraform init -backend-config="bucket=${GCP_PROJECT_ID}-tfstate"
```

### Step 5: Apply Infrastructure

```bash
# Review the plan
terraform plan

# Apply changes
terraform apply
```

### Step 6: Manual Identity Platform Setup

Identity Platform requires manual configuration:

```bash
# Enable Identity Platform
gcloud identity platforms tenants describe default --project=${GCP_PROJECT_ID} \
  || gcloud identity platforms tenants create --project=${GCP_PROJECT_ID}

# Enable Email/Password provider
gcloud identity platforms providers create email \
  --project=${GCP_PROJECT_ID} \
  --enabled

# Enable Google provider
# First, create OAuth credentials in GCP Console:
# https://console.cloud.google.com/apis/credentials
# Then run:
gcloud identity platforms providers create google \
  --project=${GCP_PROJECT_ID} \
  --enabled \
  --client-id="YOUR_OAUTH_CLIENT_ID" \
  --client-secret="YOUR_OAUTH_CLIENT_SECRET"
```

### Step 7: Update JWT Audience Secret

```bash
# Update the jwt-audience secret with your actual value
echo -n "your-project-id" | gcloud secrets versions add jwt-audience \
  --project=${GCP_PROJECT_ID} \
  --data-file=-
```

## Architecture

### Resources

```
┌─────────────────────────────────────────────────────┐
│                 GitHub Actions                       │
│            (Workload Identity Fed)                   │
└────────────────┬────────────────────────────────────┘
                 │ OIDC Auth
                 ▼
┌─────────────────────────────────────────────────────┐
│              Terraform Deployer SA                   │
└────────────────┬────────────────────────────────────┘
                 │ Manages Infrastructure
                 ▼
┌─────────────────────────────────────────────────────┐
│                  GCP Project                         │
│                                                      │
│  ┌──────────────┐  ┌─────────────────┐             │
│  │ Cloud Run    │  │ Artifact        │             │
│  │ (Private)    │  │ Registry        │             │
│  └──────┬───────┘  └─────────────────┘             │
│         │                                            │
│         │ Uses                                       │
│         ▼                                            │
│  ┌──────────────┐  ┌─────────────────┐             │
│  │ Firestore    │  │ Cloud Storage   │             │
│  │ (Native)     │  │ (Imports)       │             │
│  └──────────────┘  └─────────────────┘             │
│                                                      │
│  ┌──────────────┐  ┌─────────────────┐             │
│  │ Secret       │  │ Identity        │             │
│  │ Manager      │  │ Platform        │             │
│  └──────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────┘
```

### Security Model

1. **Cloud Run Service**: Private (no public access)
   - No `allUsers` or `allAuthenticatedUsers` IAM binding
   - Requires valid JWT from Identity Platform
   - Runtime service account with minimal permissions

2. **Authentication Flow**:
   ```
   Client App → Identity Platform (login)
                ↓
   Client App ← JWT Token
                ↓
   Client App → Cloud Run (with JWT in Authorization header)
                ↓
   Cloud Run → Verify JWT → Process Request
   ```

3. **IAM Least Privilege**:
   - Runtime SA: Only Firestore user, Storage viewer, Secret accessor
   - Terraform SA: Only permissions needed for infrastructure management
   - No service account keys; only Workload Identity

## CI/CD Workflow

### Pull Requests
- Trigger: `terraform-plan.yml`
- Actions:
  1. Authenticate via Workload Identity
  2. `terraform fmt -check`
  3. `terraform validate`
  4. `terraform plan`
  5. Post plan as PR comment

### Main Branch
- Trigger: `terraform-apply.yml`
- Actions:
  1. Authenticate via Workload Identity
  2. `terraform apply -auto-approve`
  3. Update outputs

## Deploying Application Updates

The Cloud Run service is deployed via Terraform, but application code is built and pushed separately:

### Via GitHub Actions (Recommended)
See [../.github/workflows/README.md](../.github/workflows/README.md)

### Manual Deployment
```bash
# Build image
cd ../backend
docker build -t ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest .

# Push to Artifact Registry
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
docker push ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest

# Update Terraform
cd ../infra
terraform apply -var="container_image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest"
```

## Testing the Deployment

```bash
# Get service URL
SERVICE_URL=$(terraform output -raw cloudrun_service_url)

# Get an identity token (for testing)
TOKEN=$(gcloud auth print-identity-token)

# Test the health endpoint
curl -H "Authorization: Bearer ${TOKEN}" ${SERVICE_URL}/healthz
```

## Troubleshooting

### Issue: Terraform state locked
```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

### Issue: API not enabled
```bash
# Enable manually
gcloud services enable SERVICE_NAME --project=${GCP_PROJECT_ID}
```

### Issue: Permission denied
```bash
# Check service account permissions
gcloud projects get-iam-policy ${GCP_PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:terraform-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

### Issue: Cloud Run deployment fails
```bash
# Check Cloud Run logs
gcloud run services logs read ${SERVICE_NAME} \
  --project=${GCP_PROJECT_ID} \
  --region=${GCP_REGION}
```

## State Management

- **Remote State**: Stored in GCS bucket `${project_id}-tfstate`
- **State Locking**: Automatic with GCS backend
- **Versioning**: Enabled on state bucket
- **Backup**: State bucket retains 5 previous versions

## Cleanup

To destroy all resources:

```bash
# Destroy main infrastructure
terraform destroy

# Destroy bootstrap (WARNING: This deletes the state bucket)
cd bootstrap
terraform destroy
```

⚠️ **Caution**: Destroying the bootstrap will delete your Terraform state bucket. Ensure all resources are destroyed first.
