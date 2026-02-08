# Phase 3 Execution Plan: MVP Core Loop

> **Status**: Approved plan for implementation
> **Created**: 2024-01
> **Scope**: Imported transactions → rule-based categorization → ledger view → user corrections → rule learning → monthly overview

## Executive Summary

This plan delivers the core expense tracking loop with full explainability. Cloud Run remains private; Firebase Hosting proxies `/api/*` requests with Identity Platform token validation.

---

## 1. Milestone Plan

### Milestone 1: Transaction Listing API + Basic UI

**Scope:**
- GET `/api/transactions` with pagination, date range filter, stable sorting
- Firestore query with composite index on `(uid, postedAt)`
- Basic Next.js transactions page with table view

**Acceptance Criteria:**
- [ ] API returns paginated transactions for authenticated user only
- [ ] Default view shows current month, sorted by `postedAt DESC`
- [ ] Pagination cursor works correctly (no duplicates, no gaps)
- [ ] Empty state renders when no transactions
- [ ] Loading state shows skeleton
- [ ] 401 returned for unauthenticated requests

**Tests:**
- Unit: pagination cursor encoding/decoding
- Integration: query returns only user's transactions (uid isolation)
- E2E: load transactions page, verify table renders

---

### Milestone 2: Categorization Engine (Rule Matching)

**Scope:**
- Rule matching engine with priority-based conflict resolution
- Match strategies: exact merchant → contains → regex → default
- Explainability payload attached to each transaction

**Acceptance Criteria:**
- [ ] Rules are evaluated in priority order (higher priority wins)
- [ ] First matching rule wins; no further evaluation
- [ ] Explainability object includes: `ruleId`, `matchType`, `matchedValue`, `confidence`
- [ ] Uncategorized transactions get `categoryId: null` with explainability `{ reason: "no_match" }`
- [ ] Engine is pure function: `(transaction, rules[]) => { categoryId, explainability }`

**Tests:**
- Unit: exact match beats contains match when same priority
- Unit: higher priority rule wins regardless of match type
- Unit: regex patterns match correctly
- Unit: no rules → returns null categoryId with explanation

---

### Milestone 3: Transaction Update + Category Correction

**Scope:**
- PATCH `/api/transactions/{txId}` for category, notes, tags
- Audit trail: store `previousCategoryId`, `correctedAt`, `correctedBy`
- UI: category dropdown, notes field, tags input

**Acceptance Criteria:**
- [ ] User can change category; change persists immediately
- [ ] `manualOverride: true` flag set on corrected transactions
- [ ] Original auto-categorization preserved in `autoCategory` field
- [ ] Tags stored as string array, max 10 tags, max 50 chars each
- [ ] Notes field max 500 chars
- [ ] Optimistic UI update with rollback on failure

**Tests:**
- Unit: validation rejects invalid tags/notes
- Integration: update persists and returns updated transaction
- E2E: change category in UI, refresh, verify persistence

---

### Milestone 4: Rule Suggestion from Corrections

**Scope:**
- When user corrects category, detect pattern and suggest rule
- POST `/api/rules/suggestions` generates suggestion without saving
- User confirms → POST `/api/rules` creates rule
- Anti-explosion: limit suggestions to merchant-based rules only

**Acceptance Criteria:**
- [ ] Correction on transaction with merchant triggers suggestion
- [ ] Suggestion shows: "Create rule: Merchant contains 'STARBUCKS' → Food & Drink?"
- [ ] User can accept, modify, or dismiss suggestion
- [ ] Dismissed suggestions don't reappear for same merchant
- [ ] Max 1 suggestion per correction (no spam)

**Tests:**
- Unit: suggestion generator extracts merchant pattern
- Unit: duplicate rule not suggested if equivalent exists
- Integration: accepted suggestion creates valid rule

---

### Milestone 5: Transaction Splits

**Scope:**
- POST `/api/transactions/{txId}/split` creates split transactions
- Original transaction marked as `isSplit: true`, `splitParentId: null`
- Child transactions have `splitParentId: originalTxId`
- Total of splits must equal original amount

**Acceptance Criteria:**
- [ ] Split creates 2+ child transactions
- [ ] Sum of child amounts equals parent amount (cents precision)
- [ ] Parent transaction hidden from normal list (filter `isSplit: false OR splitParentId: null`)
- [ ] Children shown with visual indicator of split
- [ ] Split can be "unsplit" (delete children, restore parent)
- [ ] Each child can have different category

**Tests:**
- Unit: split amount validation (sum must equal parent)
- Unit: minimum 2 splits required
- Integration: split and unsplit round-trip
- E2E: split transaction in UI, verify children appear

---

### Milestone 6: Advanced Filters + Search

**Scope:**
- Extend GET `/api/transactions` with filters: categoryId, accountId, merchant search, amount range
- Compound Firestore queries with appropriate indexes
- UI filter panel with chips

**Acceptance Criteria:**
- [ ] Filter by category shows only matching transactions
- [ ] Filter by account shows only matching transactions
- [ ] Merchant search is case-insensitive substring match
- [ ] Amount range filter: `minAmount`, `maxAmount` (inclusive)
- [ ] Filters combine with AND logic
- [ ] Active filters shown as removable chips
- [ ] URL reflects filter state (shareable/bookmarkable)

**Tests:**
- Unit: filter parameter validation
- Integration: compound query returns correct subset
- E2E: apply filter, verify results, clear filter

---

### Milestone 7: Monthly Overview Dashboard

**Scope:**
- GET `/api/analytics/monthly?month=2024-01` returns aggregated data
- Spend by category (pie/bar data)
- Top 5 merchants by spend
- Month-over-month trend (vs previous month)

**Acceptance Criteria:**
- [ ] Returns category breakdown with amounts and percentages
- [ ] Returns top merchants with transaction count and total
- [ ] Returns total spend, transaction count for month
- [ ] Returns comparison delta vs previous month
- [ ] Response cached for 5 minutes (cache-control header)
- [ ] Dashboard renders charts (simple bar/pie)

**Tests:**
- Unit: aggregation logic handles edge cases (no transactions, single transaction)
- Integration: aggregation matches sum of individual transactions
- E2E: dashboard loads and displays charts

---

### Milestone 8: Explainability UI + Rules Management

**Scope:**
- Transaction detail drawer shows "Why this category?" section
- Rules CRUD UI: list, create, edit, delete, reorder priority
- POST `/api/categorization/rerun?importId=X` to reprocess batch

**Acceptance Criteria:**
- [ ] Clicking transaction shows drawer with explainability
- [ ] Explainability shows: rule name, match type, matched value
- [ ] Manual overrides show "Manually set by you on [date]"
- [ ] Rules page lists all user rules sorted by priority
- [ ] Drag-drop to reorder priority
- [ ] Delete rule shows confirmation
- [ ] Rerun categorization updates transactions (respects `manualOverride`)

**Tests:**
- Unit: explainability serialization
- Integration: rerun updates only non-manual transactions
- E2E: create rule, rerun, verify transactions recategorized

---

## 2. System Design

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Next.js Web │  │  Mobile App  │  │   CLI Tool   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         └─────────────────┼─────────────────┘                       │
│                           │ HTTPS + Bearer Token                    │
└───────────────────────────┼─────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Firebase Hosting (Proxy)                         │
│         rewrites /api/* → Cloud Run (internal)                      │
└───────────────────────────┼─────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Cloud Run (Private)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Auth Middleware                           │   │
│  │         (JWT validation via Identity Platform)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────┬───────────┬───────────┬───────────┬────────────┐   │
│  │Transaction│  Rules    │  Category │ Analytics │   Import   │   │
│  │ Service   │  Service  │  Engine   │  Service  │  Service   │   │
│  └─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴──────┬─────┘   │
└────────┼───────────┼───────────┼───────────┼────────────┼──────────┘
         ▼           ▼           ▼           ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Firestore                                   │
│  users | accounts | transactions | categories | rules | imports    │
│  merchants | dismissedSuggestions                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. IMPORT (Phase 2 complete)
   CSV Upload → Parse → Normalize → Generate txId (hash) → Write to Firestore

2. CATEGORIZATION (Phase 3)
   For each transaction:
   ├─ Load user's rules (sorted by priority DESC)
   ├─ Run through categorization engine
   │   ├─ Try exact merchant match
   │   ├─ Try contains merchant match
   │   ├─ Try regex match
   │   └─ Fallback: uncategorized
   ├─ Attach explainability payload
   └─ Write categoryId + explainability to transaction

3. USER CORRECTION
   User changes category
   ├─ Update transaction (set manualOverride: true)
   ├─ Preserve autoCategory for comparison
   ├─ Generate rule suggestion (if merchant-based)
   └─ User accepts → Create rule

4. RULE LEARNING
   New rule created
   ├─ Optionally rerun categorization on affected transactions
   └─ Only update transactions where manualOverride: false

5. ANALYTICS READ
   Monthly aggregation query
   ├─ Filter by uid + month range
   ├─ Group by categoryId
   └─ Return aggregates (with caching)
```

---

## 3. Firestore Data Model

### transactions/{txId}

```typescript
interface Transaction {
  // Existing fields
  uid: string;                    // Owner (required for security rules)
  accountId: string;              // Source account
  importId: string;               // Source import batch

  // Core transaction data
  postedAt: Timestamp;            // Transaction date
  amount: number;                 // Cents (negative = expense, positive = income)
  description: string;            // Raw description from bank
  merchantRaw: string;            // Raw merchant string
  merchantNormalized: string;     // Cleaned merchant name (uppercase, trimmed)

  // Categorization
  categoryId: string | null;      // Assigned category (null = uncategorized)
  autoCategory: {                 // Auto-categorization result (preserved)
    categoryId: string | null;
    explainability: Explainability;
    categorizedAt: Timestamp;
  } | null;
  manualOverride: boolean;        // True if user manually changed category

  // Explainability
  explainability: Explainability; // Current categorization explanation

  // User edits
  notes: string | null;           // User notes (max 500 chars)
  tags: string[];                 // User tags (max 10, each max 50 chars)
  correctedAt: Timestamp | null;  // Last manual correction time

  // Split handling
  isSplitParent: boolean;         // True if this transaction was split
  splitParentId: string | null;   // Parent txId if this is a split child

  // Metadata
  txKey: string;                  // Dedupe key (hash of accountId+date+amount+desc)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Explainability {
  reason: "rule_match" | "manual" | "no_match" | "default";
  ruleId?: string;
  ruleName?: string;
  matchType?: "exact" | "contains" | "regex";
  matchedValue?: string;
  matchedPattern?: string;
  confidence: number;             // 0-1
  timestamp: Timestamp;
}
```

### categories/{categoryId}

```typescript
interface Category {
  uid: string | null;             // null for default categories
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  parentId: string | null;        // For subcategories (future)
  sortOrder: number;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### rules/{ruleId}

```typescript
interface Rule {
  uid: string;
  name: string;
  enabled: boolean;
  priority: number;               // Higher = evaluated first (1-1000)

  conditions: {
    merchantExact?: string;
    merchantContains?: string;
    merchantRegex?: string;
    descriptionContains?: string;
    amountMin?: number;
    amountMax?: number;
    accountId?: string;
  };

  action: {
    categoryId: string;
    addTags?: string[];
  };

  source: "user" | "suggestion" | "system";
  matchCount: number;
  lastMatchedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### merchants/{merchantId} (Optional)

```typescript
interface Merchant {
  displayName: string;
  logo: string | null;
  defaultCategoryId: string | null;
  aliases: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### dismissedSuggestions/{suggestionId}

```typescript
interface DismissedSuggestion {
  uid: string;
  merchantNormalized: string;
  categoryId: string;
  dismissedAt: Timestamp;
}
```

### Required Composite Indexes

Add to `firestore/firestore.indexes.json`:

```json
[
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "categoryId", "order": "ASCENDING" },
      { "fieldPath": "postedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "manualOverride", "order": "ASCENDING" },
      { "fieldPath": "postedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "isSplitParent", "order": "ASCENDING" },
      { "fieldPath": "postedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "merchantNormalized", "order": "ASCENDING" },
      { "fieldPath": "postedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "importId", "order": "ASCENDING" },
      { "fieldPath": "postedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "transactions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "amount", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "dismissedSuggestions",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "uid", "order": "ASCENDING" },
      { "fieldPath": "merchantNormalized", "order": "ASCENDING" }
    ]
  }
]
```

---

## 4. API Specification

### Authentication
All endpoints require `Authorization: Bearer <idToken>` header.

### Response Envelope

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta?: { pagination?: { cursor?: string; hasMore: boolean; total?: number } };
}
```

### Endpoints

#### GET /api/transactions
List transactions with filtering and pagination.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | string | current | Format: `YYYY-MM` |
| `startDate` | string | - | ISO date, overrides month |
| `endDate` | string | - | ISO date, overrides month |
| `categoryId` | string | - | Filter by category |
| `accountId` | string | - | Filter by account |
| `merchant` | string | - | Substring search |
| `minAmount` | number | - | Cents (inclusive) |
| `maxAmount` | number | - | Cents (inclusive) |
| `tags` | string | - | Comma-separated (AND) |
| `uncategorized` | boolean | false | Only uncategorized |
| `limit` | number | 50 | Max 100 |
| `cursor` | string | - | Pagination cursor |

#### GET /api/transactions/{txId}
Get single transaction with full details.

#### PATCH /api/transactions/{txId}
Update transaction category, notes, or tags.

```json
{
  "categoryId": "cat_entertainment",
  "notes": "Bought snacks for movie",
  "tags": ["snacks", "movie"]
}
```

Returns updated transaction + optional rule suggestion.

#### POST /api/transactions/{txId}/split
Split a transaction into multiple parts.

```json
{
  "splits": [
    { "amount": -2000, "categoryId": "cat_food", "notes": "Food portion" },
    { "amount": -2550, "categoryId": "cat_entertainment", "notes": "Entertainment portion" }
  ]
}
```

#### DELETE /api/transactions/{txId}/split
Unsplit a transaction (delete children, restore parent).

#### GET /api/rules
List user's categorization rules.

#### POST /api/rules
Create a new rule.

```json
{
  "name": "Amazon → Shopping",
  "priority": 50,
  "conditions": { "merchantContains": "AMAZON" },
  "action": { "categoryId": "cat_shopping" }
}
```

#### PATCH /api/rules/{ruleId}
Update a rule.

#### DELETE /api/rules/{ruleId}
Delete a rule.

#### POST /api/categorization/rerun
Rerun categorization on a batch.

```json
{
  "scope": "import",
  "importId": "imp_456",
  "includeManualOverrides": false
}
```

#### GET /api/analytics/monthly
Get monthly spending overview.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | string | current | Format: `YYYY-MM` |
| `compareMonth` | string | previous | Month to compare |

#### GET /api/categories
List all categories (default + user-created).

#### POST /api/rules/suggestions/dismiss
Dismiss a rule suggestion.

```json
{
  "merchantNormalized": "STARBUCKS",
  "categoryId": "cat_entertainment"
}
```

---

## 5. Categorization Engine

### Match Priority Order

1. **Exact merchant match** (confidence: 1.0)
2. **Contains merchant match** (confidence: 0.8)
3. **Regex merchant match** (confidence: 0.6)
4. **Description contains** (confidence: 0.5)

### Conflict Resolution

```
Rules evaluated in priority order (highest first).
First matching rule wins - no further rules evaluated.

Priority Guidelines:
- 900-1000: System rules (very high specificity)
- 500-899: User exact-match rules
- 100-499: User contains-match rules
- 1-99: Catch-all rules

New user rules default to priority 500.
Suggested rules default to priority 300.
```

### Rule Suggestion Algorithm

```typescript
function suggestRule(
  transaction: Transaction,
  newCategoryId: string,
  existingRules: Rule[],
  dismissedSuggestions: DismissedSuggestion[]
): RuleSuggestion | null {
  const merchant = transaction.merchantNormalized;

  // Don't suggest if no merchant or too short
  if (!merchant || merchant.length < 3) return null;

  // Don't suggest if already dismissed
  if (isDismissed(merchant, newCategoryId, dismissedSuggestions)) return null;

  // Don't suggest if equivalent rule exists
  const existingRule = existingRules.find(r =>
    r.conditions.merchantContains?.toUpperCase() === merchant ||
    r.conditions.merchantExact?.toUpperCase() === merchant
  );
  if (existingRule) return null;

  return {
    message: `Create rule: Merchant contains '${merchant}' → ${categoryName}?`,
    rule: {
      name: `${merchant} → ${categoryName}`,
      priority: 300,
      conditions: { merchantContains: merchant },
      action: { categoryId: newCategoryId }
    }
  };
}
```

### Anti-Explosion Safeguards

1. One suggestion per correction
2. Merchant-only suggestions (no regex)
3. Minimum merchant length: 3 chars
4. Deduplication against existing rules
5. Dismissal tracking
6. User confirmation required
7. Soft limit: 100 rules per user

---

## 6. UI Scope (Next.js)

### Pages

```
/app
  /transactions          # Transaction list + filters
  /transactions/[txId]   # Transaction detail (or drawer)
  /rules                 # Rules management
  /dashboard             # Monthly overview
```

### Key Components

- **Transactions Page**: Table with month navigation, filter chips, search
- **Transaction Detail Drawer**: Category dropdown, notes, tags, explainability section
- **Split Flow Modal**: Amount inputs with validation, category selection per split
- **Rules Management**: Drag-drop priority reorder, inline enable/disable
- **Monthly Dashboard**: Category pie chart, top merchants, month comparison

### States

Every page/component must handle:
- Loading (skeleton)
- Empty (helpful message + CTA)
- Error (retry option)
- Success

---

## 7. Testing Plan

### Unit Tests

- `generateTxKey`: consistent hashing, special character handling
- `categorize`: priority ordering, match types, disabled rules
- `validateSplit`: sum validation, minimum splits
- `suggestRule`: deduplication, dismissal check

### Integration Tests

- Query returns only user's transactions (uid isolation)
- Update persists and returns updated transaction
- Rerun updates only non-manual transactions

### E2E Tests

- Import → auto-categorize → verify explainability
- Correct category → see suggestion → accept → verify rule created
- Split transaction → verify children appear → unsplit → verify restored

### Idempotency Tests

- Re-import same CSV → no duplicate transactions
- Different amount same day → new transaction created

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Merchant normalization inconsistency | Normalize on import (uppercase, trim, remove store numbers) |
| Rule explosion | Limit 100 rules, merchant-only suggestions, require confirmation |
| Firestore query performance | Composite indexes, pagination, cache analytics |
| Split transaction complexity | Strict validation, atomic operations |
| Regex injection (ReDoS) | Validate on save, timeout execution (100ms) |

---

## 9. NOT Building (Phase 3)

- Bank sync / Plaid integration
- OCR receipt scanning
- Full budgeting (goals, alerts)
- Multi-currency support
- LLM-based classification
- Recurring transaction detection
- Mobile app
- Shared accounts / multi-user

---

## 10. Implementation Order

1. **Milestone 1** - Transaction List (foundation)
2. **Milestone 2** - Categorization Engine (core value)
3. **Milestone 3** - Transaction Update (user interaction)
4. **Milestone 5** - Splits (complete transaction mgmt)
5. **Milestone 4** - Rule Suggestions (learning loop)
6. **Milestone 6** - Filters (enhanced navigation)
7. **Milestone 7** - Dashboard (insights)
8. **Milestone 8** - Explainability UI (trust & control)