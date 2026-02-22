# Codebase Map – Quick Reference for LLM Agents

Fast orientation for agents working on this repo. Read this before exploring.

---

## Monorepo Layout

```
/backend/          Node.js + TypeScript; Cloud Run; fully implemented
/spendabo_expo/    Expo (React Native) mobile app; UI complete, services mocked
/infra/            Terraform (GCP); Phase 1 provisioning
/firestore/        Firestore rules, indexes, schema docs
/web/              Next.js placeholder (not yet built)
```

---

## Mobile App (`/spendabo_expo`)

### Tab Navigation (4 tabs)
| Tab | File | Status |
|-----|------|--------|
| Dashboard | `app/(tabs)/index.tsx` | UI complete, uses mock data |
| Transactions | `app/(tabs)/transactions.tsx` | UI complete, uses mock data |
| Rules | `app/(tabs)/rules.tsx` | UI complete, uses mock data |
| Imports | `app/(tabs)/imports.tsx` | UI complete, uses mock data |

### Service Layer – All Mocked (TODO: wire to backend)
| File | Functions |
|------|-----------|
| `services/transactionService.ts` | `getTransactions`, `getTransaction`, `updateTransaction`, `getCategories`, `getMonthlyAnalytics` |
| `services/importService.ts` | `getImports`, `uploadImport` |
| `services/rulesService.ts` | `getRules`, `toggleRule`, `deleteRule` |

All service files return mock data from `services/mockData.ts`. They have `// TODO: GET /api/...` comments pointing at the correct backend endpoints.

### Key Types (`types/index.ts`)
- `Transaction` – amount in cents (negative = expense), `explainability` block, `manualOverride`, `tags`
- `Rule` – conditions (`merchantContains`, `merchantExact`, `descriptionContains`) + `action.categoryId`
- `Import` – status enum: `uploaded | processing | completed | failed`
- `MonthlyAnalytics` – `byCategory[]`, `topMerchants[]`, `vsLastMonth` (% change)

### Styling
- NativeWind (Tailwind CSS); primary teal `#14B8A6`
- Theme constants in `constants/theme.ts`

### Missing Libraries (not yet installed)
- No `expo-camera` / image picker — required for camera receipt capture
- No auth SDK wired up — services don't send `Authorization` headers yet

---

## Backend API (`/backend/src`)

Base path: `/api/v1/`
Auth: `Authorization: Bearer <Firebase ID token>` on all routes except `/healthz`

### Routes at a Glance

```
GET  /healthz                         # No auth; health check

GET  /api/v1/me                       # Current user info
GET  /api/v1/status                   # API status

# Accounts
GET  /api/v1/accounts
POST /api/v1/accounts                 # { name, type, institution?, lastFour? }

# Transactions
GET  /api/v1/transactions             # ?month, startDate, endDate, categoryId, accountId, merchant, tags, minAmount, maxAmount, limit (max 100), cursor
GET  /api/v1/transactions/:id
PATCH /api/v1/transactions/:id        # { categoryId?, notes?, tags? }
POST /api/v1/transactions/:id/split
DELETE /api/v1/transactions/:id/split/:splitId

# Categories
GET  /api/v1/categories

# Imports
POST /api/v1/imports/upload           # { accountId, content (base64), filename, mimeType }
GET  /api/v1/imports                  # ?limit (max 100)
GET  /api/v1/imports/:importId

# Rules
GET  /api/v1/rules                    # ?enabledOnly=true
GET  /api/v1/rules/:ruleId
POST /api/v1/rules
PATCH /api/v1/rules/:ruleId
DELETE /api/v1/rules/:ruleId
POST /api/v1/rules/reorder
PATCH /api/v1/rules/suggestions/:id

# Analytics
GET  /api/v1/analytics/monthly        # ?month=YYYY-MM
GET  /api/v1/analytics/trend
GET  /api/v1/analytics/categories
GET  /api/v1/analytics/accounts
```

### Upload Accepted MIME Types
`text/csv`, `application/csv`, `text/plain` → CSV parser
`application/pdf` → PDF parser
`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` → Vision LLM

Max payload: 10 MB base64-encoded (≈ 7.5 MB raw file).

### Backend Services (`/backend/src/services/`)
| File | Purpose |
|------|---------|
| `firestore.ts` | Firestore client singleton |
| `transaction-service.ts` | Transaction CRUD + queries |
| `import-service.ts` | Document parsing → transactions |
| `rule-engine.ts` | Rule-based categorization |
| `llm-categorization-service.ts` | Claude + Gemini multimodal parsing (see `llm-categorization-explained.md`) |
| `categorization-orchestrator.ts` | Combines rule engine + LLM |
| `rules-service.ts` | Rule CRUD + suggestions |
| `splits-service.ts` | Transaction splitting |
| `analytics-service.ts` | Monthly overview + trends |
| `auth.ts` | JWT / Identity Platform middleware |

---

## Firestore Collections
`users/{uid}` · `accounts/{accountId}` · `transactions/{txId}` · `categories/{categoryId}` · `rules/{ruleId}` · `imports/{importId}`

All collections are uid-scoped; security rules enforce strict isolation.

---

## Common Tasks → Where to Look

| Task | Start here |
|------|-----------|
| Connect mobile service to backend | `spendabo_expo/services/*.ts` (replace mock bodies) |
| Add camera/receipt capture to mobile | Install `expo-camera`; update `imports.tsx` |
| Add a new API endpoint | `backend/src/routes/` + register in `backend/src/index.ts` |
| Change categorization logic | `backend/src/services/rule-engine.ts` + `categorization-orchestrator.ts` |
| Update Firestore security rules | `firestore/firestore.rules` |
| Infrastructure changes | `/infra/` Terraform files |
