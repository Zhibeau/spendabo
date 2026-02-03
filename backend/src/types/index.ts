/**
 * Shared types for Spendabo backend
 */

import type { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  cursor?: string | undefined;
  hasMore: boolean;
  total?: number | undefined;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  id: string;
  uid: string;
  accountId: string;
  importId: string;

  // Core transaction data
  postedAt: Timestamp;
  amount: number; // Cents (negative = expense, positive = income)
  description: string;
  merchantRaw: string;
  merchantNormalized: string;

  // Categorization
  categoryId: string | null;
  autoCategory: AutoCategoryResult | null;
  manualOverride: boolean;

  // Explainability
  explainability: Explainability;

  // User edits
  notes: string | null;
  tags: string[];
  correctedAt: Timestamp | null;

  // Split handling
  isSplitParent: boolean;
  splitParentId: string | null;

  // Metadata
  txKey: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AutoCategoryResult {
  categoryId: string | null;
  explainability: Explainability;
  categorizedAt: Timestamp;
}

export interface Explainability {
  reason: 'rule_match' | 'llm' | 'manual' | 'no_match' | 'default' | 'split';
  ruleId?: string | undefined;
  ruleName?: string | undefined;
  matchType?: 'exact' | 'contains' | 'regex' | 'description' | undefined;
  matchedValue?: string | undefined;
  matchedPattern?: string | undefined;
  confidence: number; // 0-1
  timestamp: Timestamp;
  // LLM-specific fields
  llmModel?: string | undefined;
  llmReasoning?: string | undefined;
}

// Transaction for API responses (serialized timestamps)
export interface TransactionResponse {
  id: string;
  accountId: string;
  importId: string;
  postedAt: string;
  amount: number;
  description: string;
  merchantRaw: string;
  merchantNormalized: string;
  categoryId: string | null;
  categoryName?: string;
  manualOverride: boolean;
  notes: string | null;
  tags: string[];
  isSplitParent: boolean;
  splitParentId: string | null;
  explainability: ExplainabilityResponse;
  createdAt: string;
  updatedAt: string;
}

export interface ExplainabilityResponse {
  reason: Explainability['reason'];
  ruleId?: string;
  ruleName?: string;
  matchType?: string;
  matchedValue?: string;
  matchedPattern?: string;
  confidence: number;
  timestamp: string;
  llmModel?: string;
  llmReasoning?: string;
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  uid: string | null; // null for default categories
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  parentId: string | null;
  sortOrder: number;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  parentId: string | null;
  sortOrder: number;
}

// ============================================================================
// Rule Types
// ============================================================================

export interface Rule {
  id: string;
  uid: string;
  name: string;
  enabled: boolean;
  priority: number; // Higher = evaluated first (1-1000)

  conditions: RuleConditions;
  action: RuleAction;

  source: 'user' | 'suggestion' | 'system';
  matchCount: number;
  lastMatchedAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RuleConditions {
  merchantExact?: string;
  merchantContains?: string;
  merchantRegex?: string;
  descriptionContains?: string;
  amountMin?: number;
  amountMax?: number;
  accountId?: string;
}

export interface RuleAction {
  categoryId: string;
  addTags?: string[];
}

export interface RuleResponse {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RuleConditions;
  action: RuleAction;
  source: Rule['source'];
  matchCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Import Types
// ============================================================================

export interface Import {
  id: string;
  uid: string;
  accountId: string;
  filename: string;
  fileType: 'csv' | 'pdf' | 'image';
  storagePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionCount: number;
  errorMessage: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

// ============================================================================
// Categorization Types
// ============================================================================

export interface CategorizationExplainability {
  reason: 'rule_match' | 'llm' | 'manual' | 'no_match' | 'default' | 'split';
  ruleId?: string | undefined;
  ruleName?: string | undefined;
  matchType?: 'exact' | 'contains' | 'regex' | 'description' | undefined;
  matchedValue?: string | undefined;
  matchedPattern?: string | undefined;
  confidence: number;
  llmModel?: string | undefined;
  llmReasoning?: string | undefined;
}

export interface CategorizationResult {
  categoryId: string | null;
  tags: string[];
  explainability: CategorizationExplainability;
}

export interface RuleMatchResult {
  matched: boolean;
  matchType?: 'exact' | 'contains' | 'regex' | 'description';
  matchedValue?: string;
  matchedPattern?: string;
}

// LLM Provider Configuration
export type LLMProvider = 'anthropic' | 'vertexai';

export interface LLMConfig {
  provider: LLMProvider;
  // Anthropic-specific (uses ANTHROPIC_API_KEY env var)
  anthropicModel?: string | undefined;
  // Vertex AI-specific (uses ADC from Cloud Run service account)
  vertexProjectId?: string | undefined;
  vertexLocation?: string | undefined;
  vertexModel?: string | undefined;
}

// LLM Categorization types
export interface LLMCategorizationRequest {
  description: string;
  merchantRaw: string;
  amount: number;
  categories: Array<{ id: string; name: string }>;
}

export interface LLMCategorizationResponse {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Document Parsing Types (for CSV, PDF, receipts)
// ============================================================================

export interface ParsedTransaction {
  postedAt: Date;
  amount: number; // Cents
  description: string;
  merchantRaw: string;
}

export interface DocumentParseResult {
  transactions: ParsedTransaction[];
  metadata: {
    documentType: 'csv' | 'pdf' | 'image';
    totalRows: number;
    parsedRows: number;
    errors: string[];
  };
}

// ============================================================================
// Request Types
// ============================================================================

export interface ListTransactionsQuery {
  month?: string | undefined; // YYYY-MM
  startDate?: string | undefined; // ISO date
  endDate?: string | undefined; // ISO date
  categoryId?: string | undefined;
  accountId?: string | undefined;
  merchant?: string | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  tags?: string | undefined;
  uncategorized?: boolean | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

export interface UpdateTransactionBody {
  categoryId?: string;
  notes?: string;
  tags?: string[];
}

export interface SplitTransactionBody {
  splits: Array<{
    amount: number;
    categoryId?: string;
    notes?: string;
  }>;
}

export interface CreateRuleBody {
  name: string;
  priority?: number;
  conditions: RuleConditions;
  action: RuleAction;
}

export interface UpdateRuleBody {
  name?: string;
  enabled?: boolean;
  priority?: number;
  conditions?: RuleConditions;
  action?: RuleAction;
}

export interface RerunCategorizationBody {
  scope: 'import' | 'dateRange';
  importId?: string;
  startDate?: string;
  endDate?: string;
  includeManualOverrides?: boolean;
}

// ============================================================================
// Account Types
// ============================================================================

export interface Account {
  id: string;
  uid: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'other';
  institution: string;
  lastFour: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AccountResponse {
  id: string;
  name: string;
  type: Account['type'];
  institution: string;
  lastFour: string | null;
}
