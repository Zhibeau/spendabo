# Spendabo Backend API

TypeScript backend service for Spendabo, deployed on Google Cloud Run.

## Overview

This is a minimal private Cloud Run service that:
- Requires authentication via Firebase Auth / Identity Platform JWT
- Verifies JWTs on every request
- Provides a foundation for future transaction processing features
- Uses Firestore for data storage

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **Framework**: Express
- **Authentication**: Firebase Admin SDK
- **Database**: Firestore (via Firebase Admin SDK)
- **Secrets**: Google Cloud Secret Manager
- **Deployment**: Cloud Run (private)

## Project Structure

```
backend/
├── src/
│   ├── index.ts       # Entry point, Express app setup
│   ├── config.ts      # Configuration loading (env vars + secrets)
│   └── auth.ts        # JWT verification middleware
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── .eslintrc.cjs      # ESLint configuration
├── Dockerfile         # Multi-stage Docker build
└── README.md          # This file
```

## Environment Variables

Required:
- `GCP_PROJECT_ID`: GCP project ID
- `PORT`: HTTP port (default: 8080, set by Cloud Run)

Optional:
- `GCP_REGION`: GCP region (default: northamerica-northeast1)
- `JWT_AUDIENCE_SECRET`: Secret Manager secret name for JWT audience (default: jwt-audience)
- `ALLOW_LOCAL_DEV_BYPASS`: Enable auth bypass for local development (default: false, **NEVER enable in production**)

## Local Development

### Prerequisites
- Node.js 20+
- npm 9+
- Firebase CLI (for emulators)
- gcloud CLI

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export ALLOW_LOCAL_DEV_BYPASS="true"  # Only for local dev!

# Run in development mode (with auto-reload)
npm run dev
```

### With Firestore Emulator

```bash
# Start Firestore emulator (in a separate terminal)
firebase emulators:start --only firestore

# Set emulator environment variable
export FIRESTORE_EMULATOR_HOST="localhost:8080"

# Run the app
npm run dev
```

### Testing Authentication

For local development with real Firebase Auth:

```bash
# Get an identity token (requires gcloud auth)
TOKEN=$(gcloud auth print-identity-token)

# Call authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/status
```

## API Endpoints

All endpoints require authentication (Authorization: Bearer <JWT>).

### `GET /healthz`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/v1/me`
Get current authenticated user info.

**Response:**
```json
{
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com"
  }
}
```

### `GET /api/v1/status`
API status endpoint with user context.

**Response:**
```json
{
  "message": "API is running",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Building

### Local Build

```bash
# Compile TypeScript
npm run build

# Run compiled code
npm start
```

### Docker Build

```bash
# Build image
docker build -t spendabo-api .

# Run container
docker run -p 8080:8080 \
  -e GCP_PROJECT_ID="your-project-id" \
  -e ALLOW_LOCAL_DEV_BYPASS="true" \
  spendabo-api
```

## Deployment

The service is deployed via Terraform and GitHub Actions. See [../infra/README.md](../infra/README.md).

### Manual Deployment

```bash
# Set variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="northamerica-northeast1"

# Build and push image
docker build -t ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest .
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
docker push ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest

# Deploy via Terraform
cd ../infra
terraform apply -var="container_image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/spendabo/api:latest"
```

## Authentication Flow

1. **Client**: User logs in via Identity Platform (Firebase Auth)
2. **Client**: Receives JWT token
3. **Client**: Sends request with `Authorization: Bearer <JWT>` header
4. **Backend**: Receives request
5. **Backend**: `requireAuth` middleware extracts token
6. **Backend**: Verifies token with Firebase Admin SDK
7. **Backend**: Extracts `uid` and `email` from verified token
8. **Backend**: Attaches user info to `req.user`
9. **Backend**: Processes request with authenticated context

## Security

### Authentication
- **All endpoints require authentication** (including `/healthz`)
- JWT tokens are verified server-side using Firebase Admin SDK
- No client-provided UIDs are trusted; always use `req.user.uid` from verified token

### Local Development Bypass
- `ALLOW_LOCAL_DEV_BYPASS=true` disables auth for local testing
- **CRITICAL**: This must NEVER be enabled in production
- Default: `false`
- Only enable on your local machine

### Secrets
- JWT audience and other secrets loaded from Secret Manager
- Never hardcode secrets in code
- Environment variables are used only for non-sensitive config

### Network
- Cloud Run service is private (no public access)
- Requires IAM-based invocation or valid JWT
- HTTPS only (enforced by Cloud Run)

## Code Quality

### Linting
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Type Checking
```bash
# Type check without emitting files
npm run type-check
```

### Testing
```bash
# Run tests (not implemented in Phase 1-2)
npm test
```

## Troubleshooting

### Issue: Authentication fails locally
- Ensure you have a valid identity token: `gcloud auth print-identity-token`
- Or enable local dev bypass: `ALLOW_LOCAL_DEV_BYPASS=true`

### Issue: Cannot load secrets
- Ensure Secret Manager API is enabled
- Verify the secret exists: `gcloud secrets describe jwt-audience`
- Check service account has `secretmanager.secretAccessor` role

### Issue: Firestore connection fails
- Ensure Firestore API is enabled
- Check service account has `datastore.user` role
- For local dev, set `FIRESTORE_EMULATOR_HOST`

### Issue: Docker build fails
- Ensure Node.js 20+ is available in base image
- Check `package.json` and `package-lock.json` are present
- Verify `npm ci` can install dependencies

## Future Enhancements (Phase 3+)

Not implemented in current phase:
- Transaction CRUD endpoints
- Category prediction
- Rule engine for auto-categorization
- CSV import processing
- Account management
- Comprehensive unit and integration tests

See `CLAUDE.md` for phase restrictions.
