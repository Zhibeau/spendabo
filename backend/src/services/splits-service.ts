/**
 * Splits Service
 * Handles splitting transactions into multiple parts with different categories
 */

import type { Firestore, Timestamp } from '@google-cloud/firestore';
import { Collections, nowTimestamp } from './firestore.js';
import type { SplitTransactionBody } from '../types/index.js';

const MIN_SPLITS = 2;
const MAX_SPLITS = 10;

/**
 * Validate split amounts
 */
function validateSplits(
  originalAmount: number,
  splits: SplitTransactionBody['splits']
): { valid: boolean; error?: string } {
  if (splits.length < MIN_SPLITS) {
    return { valid: false, error: `Minimum ${MIN_SPLITS} splits required` };
  }

  if (splits.length > MAX_SPLITS) {
    return { valid: false, error: `Maximum ${MAX_SPLITS} splits allowed` };
  }

  const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);

  if (totalSplitAmount !== originalAmount) {
    return {
      valid: false,
      error: `Split amounts (${totalSplitAmount}) must equal original amount (${originalAmount})`,
    };
  }

  // Check that all splits have the same sign as original
  const isExpense = originalAmount < 0;
  for (const split of splits) {
    if (isExpense && split.amount > 0) {
      return { valid: false, error: 'Split amounts must be negative for expense transactions' };
    }
    if (!isExpense && split.amount < 0) {
      return { valid: false, error: 'Split amounts must be positive for income transactions' };
    }
  }

  return { valid: true };
}

/**
 * Split a transaction into multiple parts
 */
export async function splitTransaction(
  db: Firestore,
  uid: string,
  txId: string,
  body: SplitTransactionBody
): Promise<{
  parentTransaction: { id: string; isSplitParent: boolean };
  splitTransactions: Array<{
    id: string;
    splitParentId: string;
    amount: number;
    categoryId: string | null;
  }>;
} | null> {
  const parentRef = db.collection(Collections.TRANSACTIONS).doc(txId);
  const parentDoc = await parentRef.get();

  if (!parentDoc.exists) {
    return null;
  }

  const parentData = parentDoc.data();
  if (!parentData || parentData.uid !== uid) {
    return null;
  }

  // Check if already split
  if (parentData.isSplitParent) {
    throw new Error('Transaction is already split. Unsplit first to modify.');
  }

  // Check if this is a split child
  if (parentData.splitParentId) {
    throw new Error('Cannot split a transaction that is already part of a split.');
  }

  const originalAmount = parentData.amount as number;

  // Validate splits
  const validation = validateSplits(originalAmount, body.splits);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = nowTimestamp();
  const batch = db.batch();

  // Mark parent as split
  batch.update(parentRef, {
    isSplitParent: true,
    updatedAt: now,
  });

  // Create split children
  const splitTransactions: Array<{
    id: string;
    splitParentId: string;
    amount: number;
    categoryId: string | null;
  }> = [];

  for (let i = 0; i < body.splits.length; i++) {
    const split = body.splits[i];
    if (!split) continue;

    const childRef = db.collection(Collections.TRANSACTIONS).doc();

    const childData = {
      uid,
      accountId: parentData.accountId as string,
      importId: parentData.importId as string,
      postedAt: parentData.postedAt as Timestamp,
      amount: split.amount,
      description: `${String(parentData.description)} (Split ${i + 1}/${body.splits.length})`,
      merchantRaw: parentData.merchantRaw as string,
      merchantNormalized: parentData.merchantNormalized as string,
      categoryId: split.categoryId ?? null,
      autoCategory: null,
      manualOverride: split.categoryId ? true : false,
      explainability: {
        reason: 'split' as const,
        confidence: 1.0,
        timestamp: now,
      },
      notes: split.notes ?? null,
      tags: [],
      correctedAt: split.categoryId ? now : null,
      isSplitParent: false,
      splitParentId: txId,
      txKey: `${parentData.txKey}_split_${i}`,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(childRef, childData);

    splitTransactions.push({
      id: childRef.id,
      splitParentId: txId,
      amount: split.amount,
      categoryId: split.categoryId ?? null,
    });
  }

  await batch.commit();

  return {
    parentTransaction: {
      id: txId,
      isSplitParent: true,
    },
    splitTransactions,
  };
}

/**
 * Unsplit a transaction (delete children, restore parent)
 */
export async function unsplitTransaction(
  db: Firestore,
  uid: string,
  txId: string
): Promise<{
  transaction: { id: string; isSplitParent: boolean; amount: number };
  deletedCount: number;
} | null> {
  const parentRef = db.collection(Collections.TRANSACTIONS).doc(txId);
  const parentDoc = await parentRef.get();

  if (!parentDoc.exists) {
    return null;
  }

  const parentData = parentDoc.data();
  if (!parentData || parentData.uid !== uid) {
    return null;
  }

  // Check if actually split
  if (!parentData.isSplitParent) {
    throw new Error('Transaction is not split');
  }

  // Find all split children
  const childrenSnapshot = await db
    .collection(Collections.TRANSACTIONS)
    .where('uid', '==', uid)
    .where('splitParentId', '==', txId)
    .get();

  const batch = db.batch();

  // Delete all children
  for (const childDoc of childrenSnapshot.docs) {
    batch.delete(childDoc.ref);
  }

  // Restore parent
  batch.update(parentRef, {
    isSplitParent: false,
    updatedAt: nowTimestamp(),
  });

  await batch.commit();

  return {
    transaction: {
      id: txId,
      isSplitParent: false,
      amount: parentData.amount as number,
    },
    deletedCount: childrenSnapshot.size,
  };
}

/**
 * Get split children of a transaction
 */
export async function getSplitChildren(
  db: Firestore,
  uid: string,
  parentTxId: string
): Promise<Array<{
  id: string;
  amount: number;
  categoryId: string | null;
  notes: string | null;
}>> {
  const snapshot = await db
    .collection(Collections.TRANSACTIONS)
    .where('uid', '==', uid)
    .where('splitParentId', '==', parentTxId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount as number,
      categoryId: data.categoryId as string | null,
      notes: data.notes as string | null,
    };
  });
}
