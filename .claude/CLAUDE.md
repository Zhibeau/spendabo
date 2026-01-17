# Spendabo – Claude Code Master Instructions

You MUST read and follow this document before generating or modifying any code.

This file defines the long-term architecture, phase roadmap, and hard constraints
for the Spendabo project.

---

## 1. Project Overview

Spendabo is a cloud-native, privacy-first expense tracking application.

Core MVP user journey:
Import bank/credit card statements → automatic/manual categorization →
monthly reports → CSV export.

The project is designed to evolve from MVP to production-grade SaaS.

---

## 2. Phase Roadmap (AUTHORITATIVE)

### Phase 1 – GCP Infrastructure (MVP REQUIRED)
- GCP APIs enabled
- Firestore (Native mode) + security rules draft
- Identity Platform (Email + Google)
- Cloud Storage (imports bucket)
- Cloud Run (minimal service with /healthz)
- Secret Manager (placeholders)
- Cloud Logging + Error Reporting

### Phase 2 – Data Model (MVP REQUIRED)
- Firestore collection conventions
- Security rules
- Index suggestions

⚠️ **IMPORTANT**
Only Phase 1 and Phase 2 may be IMPLEMENTED during repo initialization.

---

### Phase 3+ (DO NOT IMPLEMENT YET)

Phases 3–13 define the future roadmap:
- Backend APIs
- CSV import & normalization
- Rules engine
- Frontend UI
- Async pipelines
- Merchant intelligence
- Bank sync
- Reporting & tax features
- Security hardening & compliance
- Monetization

These phases may be:
- Documented
- Commented
- Referenced in README

They MUST NOT be implemented in code during initialization.

---

## 3. Monorepo Structure (Long-Term)

This is a monorepo. The structure MUST be preserved long-term.

/web # Next.js frontend (may be empty or placeholder initially)
/app # Flutter app (optional, may be empty)
/backend # Cloud Run backend (TypeScript)
/infra # Terraform infrastructure
/firestore # Firestore rules, indexes, schema docs


During initial generation:
- `/infra` MUST be implemented
- `/backend` MUST contain a minimal skeleton + /healthz
- `/web` and `/app` may be placeholders only

---

## 4. Technology Stack (Locked)

### Language
- TypeScript ONLY for all application code

### Frontend
- Next.js (TypeScript)

### Backend
- Node.js + TypeScript
- Deployed on Cloud Run

### Infrastructure
- Terraform >= 1.5
- Google Cloud Platform

---

## 5. Security Posture (STRICT BY DEFAULT)

Security is not negotiable.

### Cloud Run
- Cloud Run services MUST be private
- NO public (`allUsers`) access
- Authentication required from day one

### Identity
- Use Identity Platform
- JWT validation required on backend

### Storage
- Uniform bucket-level access
- No public access

### Secrets
- Secret Manager only
- No secrets in code, env vars, or Terraform outputs

Refer to `rules/security.md`.

---

## 6. Firestore Rules

Firestore is schemaless:
- DO NOT create collections via Terraform

Required collections:
- users/{uid}
- accounts/{accountId}
- transactions/{txId}
- categories/{categoryId}
- rules/{ruleId}
- imports/{importId}

Rules MUST enforce strict uid-based isolation.

---

## 7. CI/CD & Terraform

- GitHub Actions only
- OIDC Workload Identity Federation
- No service account keys
- PR: plan
- main: apply
- Remote state on GCS

---

## 8. Working Style

- Prefer incremental changes
- Output full files with paths
- Never guess silently
- Do not implement future phases early
- Design everything for extension, not rewrite
