# Spendabo

**Spendabo** is a personal finance application for tracking transactions, categorizing spending, and gaining insights into your financial habits.

## Current Status: Phase 1-2 (MVP Infrastructure)

This repository contains:
- ✅ **Phase 1**: GCP infrastructure provisioned with Terraform
- ✅ **Phase 2**: Firestore data model defined with security rules

**Not yet implemented** (Phase 3+):
- ❌ Transaction processing logic
- ❌ Category prediction algorithms
- ❌ CSV import processing
- ❌ Web frontend UI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                       │
│              (Workload Identity Federation)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   GCP Project                           │
│                                                         │
│  ┌────────────────┐         ┌──────────────────┐        │
│  │  Cloud Run     │────────>│  Firestore       │        │
│  │  (Private API) │         │  (Native Mode)   │        │
│  └────────┬───────┘         └──────────────────┘        │
│           │                                             │
│           │                 ┌──────────────────┐        │
│           └────────────────>│  Cloud Storage   │        │
│                             │  (Imports)       │        │
│  ┌────────────────┐         └──────────────────┘        │
│  │  Identity      │                                     │
│  │  Platform      │         ┌──────────────────┐        │
│  │  (Auth)        │         │  Secret Manager  │        │
│  └────────────────┘         └──────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
spendabo/
├── CLAUDE.md                    # Development constraints and guidelines
├── rules/                       # Code style, testing, and security rules
│   ├── code-style.md
│   ├── testing.md
│   └── security.md
├── infra/                       # Terraform infrastructure as code
│   ├── bootstrap/               # Bootstrap for remote state and WIF
│   ├── main.tf                  # Main infrastructure resources
│   ├── versions.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
├── backend/                     # TypeScript Cloud Run service
│   ├── src/
│   │   ├── index.ts            # Express app entry point
│   │   ├── auth.ts             # JWT verification middleware
│   │   └── config.ts           # Configuration loading
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── firestore/                   # Firestore schema and rules
│   ├── README.md               # Data model documentation
│   ├── firestore.rules         # Security rules
│   └── firestore.indexes.json  # Composite indexes
├── web/                         # Frontend placeholder (Phase 3+)
│   └── README.md
├── .github/workflows/           # CI/CD workflows
│   ├── terraform-plan.yml      # PR validation
│   ├── terraform-apply.yml     # Infrastructure deployment
│   ├── backend-lint.yml        # Code quality checks
│   └── backend-build-deploy.yml # Backend deployment
└── README.md                    # This file
```

## Quick Start

### Prerequisites

- Google Cloud account with billing enabled
- GCP project created
- `gcloud` CLI installed and authenticated
- Terraform >= 1.5
- Node.js >= 20 (for backend development)
- GitHub repository for CI/CD

### Step 1: Bootstrap Infrastructure

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="northamerica-northeast1"
export GITHUB_REPO="spendabo"

# Run bootstrap to create state bucket and WIF
cd infra/bootstrap
terraform init
terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="github_repo=${GITHUB_REPO}"
```

See [infra/bootstrap/README.md](infra/bootstrap/README.md) for details.

### Step 2: Configure GitHub Actions

Add the following **Variables** to your GitHub repository (Settings → Secrets and variables → Actions → Variables):

- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_REGION`: `northamerica-northeast1`
- `TF_STATE_BUCKET`: Output from bootstrap
- `WIF_PROVIDER`: Output from bootstrap
- `WIF_SERVICE_ACCOUNT`: Output from bootstrap

### Step 3: Deploy Infrastructure

```bash
# Create terraform.tfvars
cd ../  # Back to /infra
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id and settings

# Initialize Terraform with remote backend
terraform init -backend-config="bucket=${GCP_PROJECT_ID}-tfstate"

# Deploy infrastructure
terraform apply
```

### Step 4: Enable Identity Platform

Identity Platform requires manual setup:

```bash
# Enable Identity Platform
gcloud identity platforms tenants describe default --project=${GCP_PROJECT_ID} \
  || gcloud identity platforms tenants create --project=${GCP_PROJECT_ID}

# Enable Email/Password provider
gcloud identity platforms providers create email \
  --project=${GCP_PROJECT_ID} \
  --enabled

# Enable Google provider (requires OAuth client setup)
# See: https://console.cloud.google.com/apis/credentials
```

### Step 5: Deploy Backend

On push to `main` branch, GitHub Actions will:
1. Build Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run

Or manually:

```bash
cd backend
docker build -t ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest .
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
docker push ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest

# Update Cloud Run service
gcloud run services update spendabo-api \
  --region=${GCP_REGION} \
  --image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest \
  --project=${GCP_PROJECT_ID}
```

### Step 6: Deploy Firestore Rules and Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules --project=${GCP_PROJECT_ID}

# Deploy indexes
firebase deploy --only firestore:indexes --project=${GCP_PROJECT_ID}
```

## Security

### Private by Default
- Cloud Run service is **private** (no public access)
- All API requests require valid JWT from Identity Platform
- No `allUsers` or `allAuthenticatedUsers` IAM bindings

### Authentication
- Users authenticate via Identity Platform (Email + Google login)
- Backend verifies JWT on every request using Firebase Admin SDK
- JWT audience and secrets stored in Secret Manager

### IAM Least Privilege
- Cloud Run runtime SA: Only Firestore user, Storage viewer, Secret accessor
- Terraform deployer SA: Only permissions needed for infrastructure management
- No service account keys; Workload Identity Federation for CI/CD

### Data Isolation
- Firestore rules enforce strict UID-based isolation
- Users can only access their own data
- All reads/writes require authentication

See [rules/security.md](rules/security.md) for detailed security guidelines.

## Development

### Backend Local Development

```bash
cd backend
npm install
export GCP_PROJECT_ID="your-project-id"
export ALLOW_LOCAL_DEV_BYPASS="true"  # Only for local dev!
npm run dev
```

See [backend/README.md](backend/README.md) for details.

### Infrastructure Changes

1. Edit Terraform files in `infra/`
2. Create PR → CI runs `terraform plan`
3. Review plan in PR comments
4. Merge to main → CI runs `terraform apply`

## CI/CD Workflows

### Pull Requests
- **Terraform Plan**: Validates and plans infrastructure changes
- **Backend Lint**: Runs ESLint and type checking

### Main Branch
- **Terraform Apply**: Deploys infrastructure changes
- **Backend Build and Deploy**: Builds and deploys backend to Cloud Run

All workflows use Workload Identity Federation (no service account keys).

## Testing

Currently in Phase 1-2, testing is minimal:
- Terraform syntax validation (`terraform fmt`, `terraform validate`)
- TypeScript type checking
- ESLint code quality checks

Phase 3+ will add:
- Unit tests for backend logic
- Integration tests with Firestore emulator
- End-to-end API tests

## Documentation

- [CLAUDE.md](CLAUDE.md): Core development principles and constraints
- [rules/code-style.md](rules/code-style.md): TypeScript style guidelines
- [rules/testing.md](rules/testing.md): Testing standards
- [rules/security.md](rules/security.md): Security best practices
- [infra/README.md](infra/README.md): Infrastructure setup and deployment
- [backend/README.md](backend/README.md): Backend development guide
- [firestore/README.md](firestore/README.md): Data model and schema

## Troubleshooting

### Issue: "Permission denied" during Terraform apply
- Ensure Terraform deployer SA has necessary roles
- Check Workload Identity binding for GitHub Actions

### Issue: Cloud Run health checks failing
- Verify `/healthz` endpoint is accessible
- Check Cloud Run logs: `gcloud run services logs read spendabo-api`

### Issue: Authentication fails
- Ensure Identity Platform is enabled
- Verify JWT audience secret is set correctly
- Check that Firebase Admin SDK is initialized

### Issue: Firestore rules deny access
- Verify user is authenticated
- Check that `uid` field matches `request.auth.uid`
- Review rules in `firestore/firestore.rules`

## Roadmap

### Phase 1 (✅ Complete)
- GCP infrastructure provisioned with Terraform
- Private Cloud Run backend deployed
- Workload Identity Federation for CI/CD
- Secret Manager integration

### Phase 2 (✅ Complete)
- Firestore data model defined
- Security rules enforcing UID isolation
- Composite indexes for common queries

### Phase 3 (Future)
- Transaction CRUD API endpoints
- CSV import processing
- Category prediction engine
- Rule-based auto-categorization

### Phase 4 (Future)
- Web frontend (React + TypeScript)
- User dashboard and analytics
- Mobile-responsive UI
- Advanced reporting features

## Contributing

This is a personal project, but contributions are welcome.

Before contributing:
1. Read [CLAUDE.md](CLAUDE.md) for core constraints
2. Follow code style in [rules/code-style.md](rules/code-style.md)
3. Adhere to security guidelines in [rules/security.md](rules/security.md)

## License

UNLICENSED - This is a private project.

## Support

For issues or questions, see:
- [infra/README.md](infra/README.md) for infrastructure troubleshooting
- [backend/README.md](backend/README.md) for backend development help
- [firestore/README.md](firestore/README.md) for data model questions
