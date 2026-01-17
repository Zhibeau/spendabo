# Firestore Data Model

This document defines the Firestore data model, schema conventions, and query patterns for Spendabo.

## Overview

- **Mode**: Firestore Native
- **Security**: UID-based isolation (all data scoped to authenticated users)
- **Approach**: Top-level collections with `uid` field for ownership

We chose top-level collections over subcollections for better query flexibility and cross-collection aggregations in future phases.

## Collections

### `users/{uid}`

User profile and settings.

**Document ID**: Firebase Auth UID

**Fields**:
```typescript
{
  uid: string;              // Firebase Auth UID (immutable)
  email: string;            // User email
  displayName?: string;     // Optional display name
  defaultAccountId: string; // Reference to default account
  createdAt: Timestamp;     // Account creation time
  updatedAt: Timestamp;     // Last update time
}
```

**Security**: Users can read/write only their own document.

**Indexes**: None required (queries by document ID only).

---

### `accounts/{accountId}`

Financial accounts (bank accounts, credit cards, etc.). MVP supports one default account per user.

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  accountId: string;        // Document ID (immutable)
  uid: string;              // Owner UID (immutable)
  name: string;             // User-defined account name
  type: string;             // 'checking' | 'savings' | 'credit_card' | 'other'
  currency: string;         // ISO 4217 currency code (e.g., 'CAD', 'USD')
  institution?: string;     // Optional institution name
  lastImportAt?: Timestamp; // Last successful import timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security**: Users can read/write only their own accounts (`uid` match).

**Indexes**:
- Composite: `uid` ASC, `createdAt` DESC (list user's accounts)

---

### `transactions/{txId}`

Individual financial transactions.

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  txId: string;             // Document ID (immutable)
  uid: string;              // Owner UID (immutable)
  accountId: string;        // Reference to account
  importId?: string;        // Reference to import batch (if imported)

  // Transaction details
  amount: number;           // Signed amount (negative = expense, positive = income)
  currency: string;         // ISO 4217 code
  postedAt: Timestamp;      // Transaction posted date
  description: string;      // Raw description from bank

  // Categorization (Phase 3+)
  normalizedMerchant?: string;  // Cleaned merchant name
  categoryId?: string;          // Assigned category
  confidence?: number;          // Auto-categorization confidence (0-1)
  manualCategory: boolean;      // True if user manually set category

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security**: Users can read/write only their own transactions (`uid` match).

**Indexes**:
- Composite: `uid` ASC, `postedAt` DESC (list user's transactions by date)
- Composite: `uid` ASC, `accountId` ASC, `postedAt` DESC (filter by account)
- Composite: `uid` ASC, `categoryId` ASC, `postedAt` DESC (filter by category)

---

### `categories/{categoryId}`

Transaction categories (predefined + user-defined).

**Document ID**: Auto-generated or predefined slug (e.g., `groceries`, `transportation`)

**Fields**:
```typescript
{
  categoryId: string;       // Document ID
  uid?: string;             // Owner UID (null for system/default categories)
  name: string;             // Display name
  icon?: string;            // Icon identifier (emoji or icon name)
  color?: string;           // Hex color code
  parentCategoryId?: string; // For subcategories (future)
  isDefault: boolean;       // True for system-provided categories
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security**:
- Default categories (`isDefault: true`): read-only for all users
- Custom categories: read/write only by owner (`uid` match)

**Indexes**:
- Composite: `uid` ASC, `name` ASC (list user's categories)
- Single: `isDefault` (fetch all default categories)

---

### `rules/{ruleId}`

Auto-categorization rules (Phase 3+).

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  ruleId: string;           // Document ID
  uid: string;              // Owner UID (immutable)

  // Matching criteria
  field: string;            // 'description' | 'merchant' | 'amount'
  operator: string;         // 'contains' | 'regex' | 'equals' | 'greater_than' | 'less_than'
  value: string | number;   // Match value

  // Action
  categoryId: string;       // Category to assign when matched

  // Priority
  priority: number;         // Higher priority rules evaluated first
  enabled: boolean;         // Toggle without deletion

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security**: Users can read/write only their own rules (`uid` match).

**Indexes**:
- Composite: `uid` ASC, `priority` DESC, `enabled` ASC (fetch active rules in order)

---

### `imports/{importId}`

Import batch metadata (CSV/file uploads).

**Document ID**: Auto-generated

**Fields**:
```typescript
{
  importId: string;         // Document ID
  uid: string;              // Owner UID (immutable)
  accountId: string;        // Target account

  // File details
  fileName: string;         // Original file name
  fileSize: number;         // Bytes
  storagePath: string;      // GCS path (gs://...)

  // Processing status
  status: string;           // 'uploaded' | 'processing' | 'completed' | 'failed'
  totalRows?: number;       // Total rows in file
  importedCount?: number;   // Successfully imported transactions
  errorCount?: number;      // Failed rows
  errorMessage?: string;    // Error details if status = 'failed'

  createdAt: Timestamp;     // Upload timestamp
  completedAt?: Timestamp;  // Processing completion
}
```

**Security**: Users can read/write only their own imports (`uid` match).

**Indexes**:
- Composite: `uid` ASC, `createdAt` DESC (list user's imports)
- Composite: `uid` ASC, `status` ASC, `createdAt` DESC (filter by status)

---

## Query Patterns

### List user's transactions (paginated)
```typescript
db.collection('transactions')
  .where('uid', '==', currentUserUid)
  .orderBy('postedAt', 'desc')
  .limit(50)
  .get();
```
**Index**: `uid` ASC, `postedAt` DESC

### Filter transactions by account
```typescript
db.collection('transactions')
  .where('uid', '==', currentUserUid)
  .where('accountId', '==', selectedAccountId)
  .orderBy('postedAt', 'desc')
  .get();
```
**Index**: `uid` ASC, `accountId` ASC, `postedAt` DESC

### Filter transactions by category
```typescript
db.collection('transactions')
  .where('uid', '==', currentUserUid)
  .where('categoryId', '==', selectedCategoryId)
  .orderBy('postedAt', 'desc')
  .get();
```
**Index**: `uid` ASC, `categoryId` ASC, `postedAt` DESC

### List user's accounts
```typescript
db.collection('accounts')
  .where('uid', '==', currentUserUid)
  .orderBy('createdAt', 'desc')
  .get();
```
**Index**: `uid` ASC, `createdAt` DESC

### List user's categorization rules
```typescript
db.collection('rules')
  .where('uid', '==', currentUserUid)
  .where('enabled', '==', true)
  .orderBy('priority', 'desc')
  .get();
```
**Index**: `uid` ASC, `enabled` ASC, `priority` DESC

### Get default categories
```typescript
db.collection('categories')
  .where('isDefault', '==', true)
  .get();
```
**Index**: `isDefault` ASC

---

## Security Model

All security rules enforce **UID isolation**: users can only access data they own.

### Key Principles
1. **Authentication Required**: All reads/writes require `request.auth != null`
2. **UID Matching**: Users can only access documents where `resource.data.uid == request.auth.uid`
3. **Immutable UIDs**: `uid` field cannot be changed after document creation
4. **User Document**: Users can read/write their own user document at `/users/{uid}`

See [firestore.rules](firestore.rules) for complete implementation.

---

## Index Strategy

Firestore automatically creates indexes for:
- Single-field queries
- Document ID lookups

**Composite indexes** (defined in `firestore.indexes.json`) are required for:
- Queries with multiple `where` clauses
- Queries combining `where` with `orderBy` on different fields
- Queries with inequality filters and `orderBy`

We define composite indexes for all anticipated query patterns above.

---

## Data Lifecycle

### Phase 1-2 (Current)
- Schema defined
- Security rules enforced
- No data created yet (collections remain empty until Phase 3+)

### Phase 3+ (Future)
- Seed default categories
- Create transactions via API or imports
- Build categorization engine
- Implement rules evaluation

---

## Migration Strategy

For future schema changes:
1. Add new fields as optional (`?`)
2. Backfill existing documents via Cloud Functions or batch jobs
3. Deploy code that handles both old and new schema
4. Mark old fields as deprecated, remove after migration complete

Example:
```typescript
// Old schema
{ amount: 1050 } // Stored in cents

// New schema (with migration period)
{
  amount: 10.50,        // New decimal format
  amountCents?: 1050    // Deprecated, for backwards compat
}
```

---

## Testing with Emulator

For local development:

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Run with emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run dev
```

All queries will run against the local emulator with the same security rules.
