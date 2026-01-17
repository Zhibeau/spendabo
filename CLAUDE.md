# Claude Development Guide

This file contains core development principles and constraints for the Spendabo project.

## Non-Negotiable Constraints

### Language & Stack
- **Application Code**: TypeScript only
- **Backend**: TypeScript (Node.js) on Cloud Run
- **Infrastructure**: Terraform >= 1.5
- **No JavaScript**: All `.js` files must have a valid reason (e.g., config files)

### Security First
- **Private by Default**: Cloud Run services must NOT be publicly accessible
- **Authentication Required**: All API endpoints require valid JWT from Identity Platform
- **Least Privilege IAM**: Grant minimum necessary permissions
- **Secret Management**: Use Secret Manager exclusively; never commit secrets
- **No Service Account Keys**: Use Workload Identity Federation for CI/CD

### Infrastructure
- **Terraform State**: Remote state in GCS (see bootstrap)
- **API Enablement**: All required GCP APIs must be explicitly enabled
- **Region**: Default to `northamerica-northeast1` (configurable)
- **Firestore**: Native mode only; no Datastore compatibility

### CI/CD
- **GitHub Actions Only**: No other CI/CD platforms
- **OIDC Authentication**: Workload Identity Federation (WIF) for GCP access
- **PR Checks**: terraform fmt, validate, and plan on all PRs
- **Main Deployment**: terraform apply only on main branch merges

### Code Quality
- See `rules/code-style.md` for TypeScript style guidelines
- See `rules/testing.md` for testing requirements
- See `rules/security.md` for security best practices

## Development Workflow

1. **Infrastructure Changes**:
   - Edit Terraform files in `/infra`
   - Create PR → CI runs plan
   - Merge to main → CI applies changes

2. **Backend Changes**:
   - Edit TypeScript in `/backend/src`
   - Lint and test locally
   - PR → CI validates
   - Merge → CI builds and deploys to Cloud Run

3. **Firestore Schema**:
   - Document in `/firestore/README.md`
   - Update `firestore.rules` for security
   - Add indexes to `firestore.indexes.json` as needed

## Phase Restrictions

### Phase 1-2 (Current)
- ✅ Provision GCP infrastructure
- ✅ Deploy minimal private Cloud Run backend
- ✅ Define Firestore schema conventions
- ✅ Implement authentication middleware

### Phase 3+ (Future)
- ❌ Do NOT implement actual transaction processing logic
- ❌ Do NOT implement category prediction algorithms
- ❌ Do NOT build frontend UI
- ❌ Do NOT integrate with external banking APIs

Keep the implementation minimal and focused on infrastructure + auth foundation.
