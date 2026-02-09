/**
 * Transaction Service
 * Handles all transaction-related Firestore operations
 */

import type { Firestore, Query, DocumentData, Timestamp } from '@google-cloud/firestore';
import {
  Collections,
  toTimestamp,
  nowTimestamp,
  createCursor,
  parseCursor,
  timestampToISO,
} from './firestore.js';
import type {
  Transaction,
  TransactionResponse,
  ExplainabilityResponse,
  Explainability,
  AutoCategoryResult,
  ListTransactionsQuery,
  UpdateTransactionBody,
  PaginationMeta,
  Category,
  CategoryResponse,
  ReceiptLineItem,
} from '../types/index.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export interface TransactionListResult {
  transactions: TransactionResponse[];
  pagination: PaginationMeta;
}

/**
 * Convert Firestore document to Transaction type
 */
function docToTransaction(id: string, data: DocumentData): Transaction {
  return {
    id,
    uid: data.uid as string,
    accountId: data.accountId as string,
    importId: data.importId as string,
    postedAt: data.postedAt as Timestamp,
    amount: data.amount as number,
    description: data.description as string,
    merchantRaw: data.merchantRaw as string,
    merchantNormalized: data.merchantNormalized as string,
    categoryId: data.categoryId as string | null,
    autoCategory: (data.autoCategory as unknown as AutoCategoryResult | null) ?? null,
    manualOverride: data.manualOverride as boolean,
    explainability: data.explainability as unknown as Explainability,
    notes: data.notes as string | null,
    tags: ((data.tags as unknown as string[] | undefined) ?? []),
    correctedAt: (data.correctedAt as Timestamp | null) ?? null,
    isSplitParent: data.isSplitParent as boolean,
    splitParentId: data.splitParentId as string | null,
    receiptLineItems: (data.receiptLineItems as ReceiptLineItem[] | null) ?? null,
    txKey: data.txKey as string,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

/**
 * Convert Transaction to API response format
 */
function toTransactionResponse(
  tx: Transaction,
  categoryMap?: Map<string, Category>
): TransactionResponse {
  const explainability: ExplainabilityResponse = {
    reason: tx.explainability.reason,
    confidence: tx.explainability.confidence,
    timestamp: timestampToISO(tx.explainability.timestamp) ?? new Date().toISOString(),
  };

  if (tx.explainability.ruleId) explainability.ruleId = tx.explainability.ruleId;
  if (tx.explainability.ruleName) explainability.ruleName = tx.explainability.ruleName;
  if (tx.explainability.matchType) explainability.matchType = tx.explainability.matchType;
  if (tx.explainability.matchedValue) explainability.matchedValue = tx.explainability.matchedValue;
  if (tx.explainability.matchedPattern) explainability.matchedPattern = tx.explainability.matchedPattern;
  if (tx.explainability.llmModel) explainability.llmModel = tx.explainability.llmModel;
  if (tx.explainability.llmReasoning) explainability.llmReasoning = tx.explainability.llmReasoning;

  const response: TransactionResponse = {
    id: tx.id,
    accountId: tx.accountId,
    importId: tx.importId,
    postedAt: timestampToISO(tx.postedAt) ?? new Date().toISOString(),
    amount: tx.amount,
    description: tx.description,
    merchantRaw: tx.merchantRaw,
    merchantNormalized: tx.merchantNormalized,
    categoryId: tx.categoryId,
    manualOverride: tx.manualOverride,
    notes: tx.notes,
    tags: tx.tags,
    isSplitParent: tx.isSplitParent,
    splitParentId: tx.splitParentId,
    receiptLineItems: tx.receiptLineItems,
    explainability,
    createdAt: timestampToISO(tx.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToISO(tx.updatedAt) ?? new Date().toISOString(),
  };

  // Add category name if available
  if (tx.categoryId && categoryMap) {
    const category = categoryMap.get(tx.categoryId);
    if (category) {
      response.categoryName = category.name;
    }
  }

  return response;
}

/**
 * Get date range for a month string (YYYY-MM)
 */
function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month format. Use YYYY-MM');
  }

  const start = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNum, 0, 23, 59, 59, 999); // Last day of month

  return { start, end };
}

/**
 * List transactions with filtering and pagination
 */
export async function listTransactions(
  db: Firestore,
  uid: string,
  query: ListTransactionsQuery
): Promise<TransactionListResult> {
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const txCollection = db.collection(Collections.TRANSACTIONS);

  // Start with base query - always filter by uid
  let firestoreQuery: Query<DocumentData> = txCollection.where('uid', '==', uid);

  // Note: isSplitParent filter applied client-side to avoid requiring composite index

  // Date range filtering
  let startDate: Date;
  let endDate: Date;

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (query.month) {
    const range = getMonthDateRange(query.month);
    startDate = range.start;
    endDate = range.end;
  } else {
    // Default to current month
    const now = new Date();
    const range = getMonthDateRange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    startDate = range.start;
    endDate = range.end;
  }

  firestoreQuery = firestoreQuery
    .where('postedAt', '>=', toTimestamp(startDate))
    .where('postedAt', '<=', toTimestamp(endDate));

  // Additional filters
  if (query.categoryId) {
    firestoreQuery = firestoreQuery.where('categoryId', '==', query.categoryId);
  }

  if (query.accountId) {
    firestoreQuery = firestoreQuery.where('accountId', '==', query.accountId);
  }

  if (query.uncategorized) {
    firestoreQuery = firestoreQuery.where('categoryId', '==', null);
  }

  // Sort by postedAt descending
  firestoreQuery = firestoreQuery.orderBy('postedAt', 'desc');

  // Pagination cursor
  const cursorData = parseCursor(query.cursor);
  if (cursorData) {
    firestoreQuery = firestoreQuery.startAfter(toTimestamp(cursorData.postedAt));
  }

  // Fetch one extra to determine if there are more results
  firestoreQuery = firestoreQuery.limit(limit + 1);

  const snapshot = await firestoreQuery.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > limit;

  // Remove the extra document if present
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;

  // Convert to transactions
  const transactions = resultDocs.map((doc) => docToTransaction(doc.id, doc.data()));

  // Fetch categories for names
  const categoryIds = [...new Set(transactions.map((tx) => tx.categoryId).filter((id): id is string => id !== null))];
  const categoryMap = await fetchCategories(db, uid, categoryIds);

  // Apply client-side filters
  let filteredTransactions = transactions.filter((tx) => !tx.isSplitParent);

  if (query.merchant) {
    const merchantSearch = query.merchant.toUpperCase();
    filteredTransactions = filteredTransactions.filter((tx) =>
      tx.merchantNormalized.includes(merchantSearch)
    );
  }

  if (query.minAmount !== undefined) {
    const min = query.minAmount;
    filteredTransactions = filteredTransactions.filter((tx) => tx.amount >= min);
  }

  if (query.maxAmount !== undefined) {
    const max = query.maxAmount;
    filteredTransactions = filteredTransactions.filter((tx) => tx.amount <= max);
  }

  if (query.tags) {
    const searchTags = query.tags.split(',').map((t) => t.trim().toLowerCase());
    filteredTransactions = filteredTransactions.filter((tx) =>
      searchTags.every((tag) => tx.tags.some((t) => t.toLowerCase() === tag))
    );
  }

  // Create cursor for next page
  const lastTx = filteredTransactions[filteredTransactions.length - 1];
  const nextCursor = lastTx && hasMore ? createCursor(lastTx.postedAt, lastTx.id) : undefined;

  return {
    transactions: filteredTransactions.map((tx) => toTransactionResponse(tx, categoryMap)),
    pagination: {
      cursor: nextCursor,
      hasMore,
    },
  };
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  db: Firestore,
  uid: string,
  txId: string
): Promise<TransactionResponse | null> {
  const doc = await db.collection(Collections.TRANSACTIONS).doc(txId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data || data.uid !== uid) {
    return null; // Not found or not owned by user
  }

  const transaction = docToTransaction(doc.id, data);

  // Fetch category for name
  const categoryMap = transaction.categoryId
    ? await fetchCategories(db, uid, [transaction.categoryId])
    : new Map();

  return toTransactionResponse(transaction, categoryMap);
}

/**
 * Update a transaction (category, notes, tags)
 */
export async function updateTransaction(
  db: Firestore,
  uid: string,
  txId: string,
  updates: UpdateTransactionBody
): Promise<TransactionResponse | null> {
  const docRef = db.collection(Collections.TRANSACTIONS).doc(txId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data || data.uid !== uid) {
    return null; // Not found or not owned by user
  }

  const currentTx = docToTransaction(doc.id, data);

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: nowTimestamp(),
  };

  if (updates.categoryId !== undefined) {
    updateData.categoryId = updates.categoryId;
    updateData.manualOverride = true;
    updateData.correctedAt = nowTimestamp();

    // Update explainability for manual override
    updateData.explainability = {
      reason: 'manual',
      confidence: 1.0,
      timestamp: nowTimestamp(),
    };

    // Preserve auto-categorization result if this is first manual override
    if (!currentTx.manualOverride && currentTx.autoCategory === null) {
      updateData.autoCategory = {
        categoryId: currentTx.categoryId,
        explainability: currentTx.explainability,
        categorizedAt: currentTx.explainability.timestamp,
      };
    }
  }

  if (updates.notes !== undefined) {
    // Validate notes length
    if (updates.notes && updates.notes.length > 500) {
      throw new Error('Notes cannot exceed 500 characters');
    }
    updateData.notes = updates.notes || null;
  }

  if (updates.tags !== undefined) {
    // Validate tags
    if (updates.tags.length > 10) {
      throw new Error('Cannot have more than 10 tags');
    }
    for (const tag of updates.tags) {
      if (tag.length > 50) {
        throw new Error('Each tag cannot exceed 50 characters');
      }
    }
    updateData.tags = updates.tags;
  }

  await docRef.update(updateData);

  // Fetch updated transaction
  const updatedDoc = await docRef.get();
  const updatedData = updatedDoc.data();
  if (!updatedData) {
    throw new Error('Failed to fetch updated transaction');
  }

  const updatedTx = docToTransaction(updatedDoc.id, updatedData);
  const categoryMap = updatedTx.categoryId
    ? await fetchCategories(db, uid, [updatedTx.categoryId])
    : new Map();

  return toTransactionResponse(updatedTx, categoryMap);
}

/**
 * Create a transaction (used by import service)
 */
export async function createTransaction(
  db: Firestore,
  uid: string,
  data: {
    accountId: string;
    importId: string;
    postedAt: Date;
    amount: number;
    description: string;
    merchantRaw: string;
    merchantNormalized: string;
    txKey: string;
    categoryId?: string | null;
    explainability?: Transaction['explainability'];
    receiptLineItems?: ReceiptLineItem[] | null;
  }
): Promise<string> {
  const now = nowTimestamp();

  const transactionData = {
    uid,
    accountId: data.accountId,
    importId: data.importId,
    postedAt: toTimestamp(data.postedAt),
    amount: data.amount,
    description: data.description,
    merchantRaw: data.merchantRaw,
    merchantNormalized: data.merchantNormalized,
    categoryId: data.categoryId ?? null,
    autoCategory: data.categoryId
      ? {
          categoryId: data.categoryId,
          explainability: data.explainability ?? {
            reason: 'no_match' as const,
            confidence: 0,
            timestamp: now,
          },
          categorizedAt: now,
        }
      : null,
    manualOverride: false,
    explainability: data.explainability ?? {
      reason: 'no_match' as const,
      confidence: 0,
      timestamp: now,
    },
    notes: null,
    tags: [],
    correctedAt: null,
    isSplitParent: false,
    splitParentId: null,
    receiptLineItems: data.receiptLineItems ?? null,
    txKey: data.txKey,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(Collections.TRANSACTIONS).add(transactionData);
  return docRef.id;
}

/**
 * Check if a transaction with the given txKey already exists
 */
export async function transactionExistsByKey(
  db: Firestore,
  uid: string,
  txKey: string
): Promise<boolean> {
  const snapshot = await db
    .collection(Collections.TRANSACTIONS)
    .where('uid', '==', uid)
    .where('txKey', '==', txKey)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Batch update transactions with new categorization
 */
export async function batchUpdateCategories(
  db: Firestore,
  updates: Array<{
    txId: string;
    categoryId: string | null;
    explainability: Transaction['explainability'];
  }>
): Promise<number> {
  if (updates.length === 0) return 0;

  const batch = db.batch();
  const now = nowTimestamp();

  for (const update of updates) {
    const docRef = db.collection(Collections.TRANSACTIONS).doc(update.txId);
    batch.update(docRef, {
      categoryId: update.categoryId,
      explainability: update.explainability,
      autoCategory: {
        categoryId: update.categoryId,
        explainability: update.explainability,
        categorizedAt: now,
      },
      updatedAt: now,
    });
  }

  await batch.commit();
  return updates.length;
}

/**
 * Fetch categories by IDs (including default categories)
 */
async function fetchCategories(
  db: Firestore,
  uid: string,
  categoryIds: string[]
): Promise<Map<string, Category>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const categoryMap = new Map<string, Category>();

  // Firestore 'in' queries limited to 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < categoryIds.length; i += 30) {
    chunks.push(categoryIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    // Fetch user categories and default categories
    const snapshot = await db
      .collection(Collections.CATEGORIES)
      .where('__name__', 'in', chunk)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Only include if it's a default category or belongs to the user
      if (data.isDefault || data.uid === uid) {
        categoryMap.set(doc.id, {
          id: doc.id,
          uid: data.uid as string | null,
          name: data.name as string,
          icon: data.icon as string,
          color: data.color as string,
          isDefault: data.isDefault as boolean,
          parentId: data.parentId as string | null,
          sortOrder: data.sortOrder as number,
          isHidden: data.isHidden as boolean,
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp,
        });
      }
    }
  }

  return categoryMap;
}

/**
 * Get all categories for a user (including defaults)
 */
export async function getAllCategories(
  db: Firestore,
  uid: string
): Promise<CategoryResponse[]> {
  // Fetch default categories
  const defaultSnapshot = await db
    .collection(Collections.CATEGORIES)
    .where('isDefault', '==', true)
    .orderBy('sortOrder', 'asc')
    .get();

  // Fetch user's custom categories
  const userSnapshot = await db
    .collection(Collections.CATEGORIES)
    .where('uid', '==', uid)
    .where('isHidden', '==', false)
    .orderBy('sortOrder', 'asc')
    .get();

  const categories: CategoryResponse[] = [];

  for (const doc of defaultSnapshot.docs) {
    const data = doc.data();
    categories.push({
      id: doc.id,
      name: data.name as string,
      icon: data.icon as string,
      color: data.color as string,
      isDefault: true,
      parentId: data.parentId as string | null,
      sortOrder: data.sortOrder as number,
    });
  }

  for (const doc of userSnapshot.docs) {
    const data = doc.data();
    categories.push({
      id: doc.id,
      name: data.name as string,
      icon: data.icon as string,
      color: data.color as string,
      isDefault: false,
      parentId: data.parentId as string | null,
      sortOrder: data.sortOrder as number,
    });
  }

  return categories;
}
