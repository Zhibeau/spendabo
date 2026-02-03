/**
 * Import Service
 * Handles document parsing, transaction creation, and deduplication
 */

import { createHash } from 'crypto';
import type { Firestore } from '@google-cloud/firestore';
import { Collections, nowTimestamp } from './firestore.js';
import {
  createTransaction,
  transactionExistsByKey,
} from './transaction-service.js';
import { parseDocumentWithLLM, normalizeMerchantWithLLM } from './llm-categorization-service.js';
import { batchCategorizeTransactions } from './categorization-orchestrator.js';
import type { ParsedTransaction } from '../types/index.js';

/**
 * Generate a unique transaction key for deduplication
 * Key is a hash of: accountId + postedAt + amount + description
 */
export function generateTxKey(
  accountId: string,
  postedAt: Date,
  amount: number,
  description: string
): string {
  const data = `${accountId}|${postedAt.toISOString().split('T')[0]}|${amount}|${description}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Simple merchant normalization (fast, no LLM)
 */
export function normalizeMerchant(merchantRaw: string): string {
  return merchantRaw
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[#*]\d+/g, '') // Remove store numbers like #12345
    .replace(/\d{4,}/g, '') // Remove long numbers (card numbers, reference numbers)
    .replace(/\s*(PURCHASE|PAYMENT|DEBIT|CREDIT|POS|CHECKCARD)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse CSV content (simple parser for common bank formats)
 */
export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  // Detect header row
  const headerLine = lines[0];
  if (!headerLine) {
    return [];
  }
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  // Find column indices (flexible mapping for different bank formats)
  const dateIdx = headers.findIndex((h) =>
    ['date', 'posted date', 'transaction date', 'posting date'].includes(h)
  );
  const amountIdx = headers.findIndex((h) =>
    ['amount', 'debit', 'credit', 'transaction amount'].includes(h)
  );
  const descIdx = headers.findIndex((h) =>
    ['description', 'merchant', 'name', 'transaction description', 'memo'].includes(h)
  );

  // Some formats have separate debit/credit columns
  const debitIdx = headers.findIndex((h) => ['debit', 'withdrawal'].includes(h));
  const creditIdx = headers.findIndex((h) => ['credit', 'deposit'].includes(h));

  if (dateIdx === -1 || (amountIdx === -1 && debitIdx === -1)) {
    console.warn('CSV format not recognized. Headers:', headers);
    return [];
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    // Simple CSV parsing (handles quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    try {
      // Parse date
      const dateStr = values[dateIdx]?.replace(/"/g, '');
      if (!dateStr) continue;
      const postedAt = new Date(dateStr);
      if (isNaN(postedAt.getTime())) continue;

      // Parse amount
      let amount: number;
      if (amountIdx !== -1) {
        const amountStr = values[amountIdx]?.replace(/[",\s$]/g, '');
        if (!amountStr) continue;
        amount = Math.round(parseFloat(amountStr) * 100);
      } else {
        // Separate debit/credit columns
        const debitStr = values[debitIdx]?.replace(/[",\s$]/g, '') || '0';
        const creditStr = values[creditIdx]?.replace(/[",\s$]/g, '') || '0';
        const debit = Math.round(parseFloat(debitStr) * 100) || 0;
        const credit = Math.round(parseFloat(creditStr) * 100) || 0;
        amount = credit - debit; // Credits positive, debits negative
      }

      if (isNaN(amount) || amount === 0) continue;

      // Parse description/merchant
      const description = values[descIdx]?.replace(/"/g, '') || 'Unknown';

      transactions.push({
        postedAt,
        amount,
        description,
        merchantRaw: description,
      });
    } catch (error) {
      console.warn(`Failed to parse CSV line ${i}:`, error);
    }
  }

  return transactions;
}

/**
 * Process an import: parse document, dedupe, categorize, create transactions
 */
export async function processImport(
  db: Firestore,
  uid: string,
  accountId: string,
  importId: string,
  content: string | Buffer,
  documentType: 'csv' | 'pdf' | 'image',
  mimeType?: string
): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let parsedTransactions: ParsedTransaction[];

  // Update import status to processing
  const importRef = db.collection(Collections.IMPORTS).doc(importId);
  await importRef.update({
    status: 'processing',
    updatedAt: nowTimestamp(),
  });

  try {
    // Parse document
    if (documentType === 'csv' && typeof content === 'string') {
      // Use simple CSV parser first
      parsedTransactions = parseCSV(content);

      // If simple parser fails, try LLM
      if (parsedTransactions.length === 0) {
        console.info('Simple CSV parser failed, using LLM');
        const llmResult = await parseDocumentWithLLM(content, 'csv');
        parsedTransactions = llmResult.transactions;
        errors.push(...llmResult.metadata.errors);
      }
    } else {
      // Use LLM for PDF and images (multimodal)
      const llmResult = await parseDocumentWithLLM(content, documentType, mimeType);
      parsedTransactions = llmResult.transactions;
      errors.push(...llmResult.metadata.errors);
    }

    if (parsedTransactions.length === 0) {
      await importRef.update({
        status: 'failed',
        errorMessage: 'No transactions found in document',
        completedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      });
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: ['No transactions found in document', ...errors],
      };
    }

    // Deduplicate and create transactions
    let created = 0;
    let skipped = 0;

    // Prepare transactions for batch categorization
    const transactionsToCreate: Array<{
      parsed: ParsedTransaction;
      txKey: string;
      merchantNormalized: string;
    }> = [];

    for (const parsed of parsedTransactions) {
      const txKey = generateTxKey(accountId, parsed.postedAt, parsed.amount, parsed.description);

      // Check for duplicates
      const exists = await transactionExistsByKey(db, uid, txKey);
      if (exists) {
        skipped++;
        continue;
      }

      // Normalize merchant
      let merchantNormalized = normalizeMerchant(parsed.merchantRaw);

      // If normalization resulted in very short string, try LLM
      if (merchantNormalized.length < 3) {
        try {
          merchantNormalized = await normalizeMerchantWithLLM(parsed.merchantRaw);
        } catch (error) {
          console.warn('LLM merchant normalization failed:', error);
        }
      }

      transactionsToCreate.push({
        parsed,
        txKey,
        merchantNormalized,
      });
    }

    // Batch categorize all new transactions
    const categorizationInput = transactionsToCreate.map((tx, idx) => ({
      id: `temp_${idx}`,
      merchantNormalized: tx.merchantNormalized,
      merchantRaw: tx.parsed.merchantRaw,
      description: tx.parsed.description,
      amount: tx.parsed.amount,
      accountId,
    }));

    const categorizationResults = await batchCategorizeTransactions(
      db,
      uid,
      categorizationInput
    );

    // Create transactions with categorization results
    for (let i = 0; i < transactionsToCreate.length; i++) {
      const tx = transactionsToCreate[i];
      if (!tx) continue;

      const catResult = categorizationResults.get(`temp_${i}`);

      try {
        await createTransaction(db, uid, {
          accountId,
          importId,
          postedAt: tx.parsed.postedAt,
          amount: tx.parsed.amount,
          description: tx.parsed.description,
          merchantRaw: tx.parsed.merchantRaw,
          merchantNormalized: tx.merchantNormalized,
          txKey: tx.txKey,
          categoryId: catResult?.categoryId ?? null,
          explainability: catResult?.explainability
            ? { ...catResult.explainability, timestamp: nowTimestamp() }
            : {
                reason: 'no_match' as const,
                confidence: 0,
                timestamp: nowTimestamp(),
              },
        });
        created++;
      } catch (error) {
        console.error('Failed to create transaction:', error);
        errors.push(`Failed to create transaction: ${tx.parsed.description}`);
      }
    }

    // Update import status
    await importRef.update({
      status: 'completed',
      transactionCount: created,
      completedAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });

    return {
      success: true,
      created,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('Import processing failed:', error);

    await importRef.update({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });

    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Create an import record
 */
export async function createImport(
  db: Firestore,
  uid: string,
  accountId: string,
  filename: string,
  fileType: 'csv' | 'pdf' | 'image',
  storagePath: string
): Promise<string> {
  const now = nowTimestamp();

  const importData = {
    uid,
    accountId,
    filename,
    fileType,
    storagePath,
    status: 'pending',
    transactionCount: 0,
    errorMessage: null,
    createdAt: now,
    completedAt: null,
    updatedAt: now,
  };

  const docRef = await db.collection(Collections.IMPORTS).add(importData);
  return docRef.id;
}
