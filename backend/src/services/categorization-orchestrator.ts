/**
 * Categorization Orchestrator
 * Combines rule-based and LLM categorization strategies
 *
 * Strategy:
 * 1. Try rule-based categorization first (fast, deterministic)
 * 2. If no match or low confidence, fall back to LLM (smart, slower)
 * 3. Return result with full explainability
 */

import type { Firestore } from '@google-cloud/firestore';
import { categorizeWithRules, loadUserRules, updateRuleStats } from './rule-engine.js';
import { categorizeWithLLM, batchCategorizeWithLLM } from './llm-categorization-service.js';
import { getAllCategories } from './transaction-service.js';
import { nowTimestamp } from './firestore.js';
import type {
  Transaction,
  CategorizationResult,
  Explainability,
} from '../types/index.js';

// Minimum confidence threshold for rule matches to skip LLM
const RULE_CONFIDENCE_THRESHOLD = 0.7;

// Feature flag for LLM categorization (can be disabled)
const LLM_ENABLED = process.env.LLM_CATEGORIZATION_ENABLED !== 'false';

export interface CategorizationOptions {
  useLLM?: boolean; // Override LLM usage
  forceRulesOnly?: boolean; // Skip LLM entirely
}

export interface FullCategorizationResult extends CategorizationResult {
  explainability: Explainability;
  usedLLM: boolean;
}

/**
 * Categorize a single transaction
 */
export async function categorizeTransaction(
  db: Firestore,
  uid: string,
  transaction: Pick<Transaction, 'merchantNormalized' | 'description' | 'amount' | 'accountId' | 'merchantRaw'>,
  options: CategorizationOptions = {}
): Promise<FullCategorizationResult> {
  const timestamp = nowTimestamp();

  // Load user's rules
  const rules = await loadUserRules(db, uid);

  // Try rule-based categorization first
  const ruleResult = categorizeWithRules(transaction, rules);

  // If rule matched with high confidence, use that result
  if (
    ruleResult.categoryId !== null &&
    ruleResult.explainability.confidence >= RULE_CONFIDENCE_THRESHOLD
  ) {
    // Update rule stats (fire and forget)
    if (ruleResult.explainability.ruleId) {
      updateRuleStats(db, ruleResult.explainability.ruleId).catch((err) => {
        console.warn('Failed to update rule stats:', err);
      });
    }

    return {
      ...ruleResult,
      explainability: {
        ...ruleResult.explainability,
        timestamp,
      },
      usedLLM: false,
    };
  }

  // Check if LLM should be used
  const shouldUseLLM = !options.forceRulesOnly && (options.useLLM ?? LLM_ENABLED);

  if (!shouldUseLLM) {
    // Return rule result (even if no match)
    return {
      ...ruleResult,
      explainability: {
        ...ruleResult.explainability,
        timestamp,
      },
      usedLLM: false,
    };
  }

  // Fall back to LLM categorization
  try {
    const categories = await getAllCategories(db, uid);

    const llmResult = await categorizeWithLLM({
      description: transaction.description,
      merchantRaw: transaction.merchantRaw,
      amount: transaction.amount,
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    });

    // If LLM found a category, use it
    if (llmResult.categoryId !== null) {
      return {
        categoryId: llmResult.categoryId,
        tags: [],
        explainability: {
          reason: 'llm',
          confidence: llmResult.confidence,
          llmModel: 'claude-sonnet-4-20250514',
          llmReasoning: llmResult.reasoning,
          timestamp,
        },
        usedLLM: true,
      };
    }

    // LLM also couldn't categorize
    return {
      categoryId: null,
      tags: [],
      explainability: {
        reason: 'no_match',
        confidence: 0,
        llmReasoning: llmResult.reasoning,
        timestamp,
      },
      usedLLM: true,
    };
  } catch (error) {
    console.error('LLM categorization failed, using rule result:', error);

    // Fall back to rule result on LLM error
    return {
      ...ruleResult,
      explainability: {
        ...ruleResult.explainability,
        timestamp,
      },
      usedLLM: false,
    };
  }
}

/**
 * Batch categorize multiple transactions
 * Uses rules first, then batches remaining for LLM
 */
export async function batchCategorizeTransactions(
  db: Firestore,
  uid: string,
  transactions: Array<{
    id: string;
    merchantNormalized: string;
    merchantRaw: string;
    description: string;
    amount: number;
    accountId: string;
  }>,
  options: CategorizationOptions = {}
): Promise<Map<string, FullCategorizationResult>> {
  const results = new Map<string, FullCategorizationResult>();
  const timestamp = nowTimestamp();

  // Load user's rules once
  const rules = await loadUserRules(db, uid);

  // Track transactions that need LLM categorization
  const needsLLM: typeof transactions = [];

  // First pass: try rule-based categorization
  for (const tx of transactions) {
    const ruleResult = categorizeWithRules(tx, rules);

    if (
      ruleResult.categoryId !== null &&
      ruleResult.explainability.confidence >= RULE_CONFIDENCE_THRESHOLD
    ) {
      // Rule matched with high confidence
      results.set(tx.id, {
        ...ruleResult,
        explainability: {
          ...ruleResult.explainability,
          timestamp,
        },
        usedLLM: false,
      });

      // Update rule stats (fire and forget)
      if (ruleResult.explainability.ruleId) {
        updateRuleStats(db, ruleResult.explainability.ruleId).catch((err) => {
          console.warn('Failed to update rule stats:', err);
        });
      }
    } else {
      // Mark for LLM categorization
      needsLLM.push(tx);

      // Store rule result as fallback
      results.set(tx.id, {
        ...ruleResult,
        explainability: {
          ...ruleResult.explainability,
          timestamp,
        },
        usedLLM: false,
      });
    }
  }

  // Check if LLM should be used
  const shouldUseLLM = !options.forceRulesOnly && (options.useLLM ?? LLM_ENABLED);

  if (!shouldUseLLM || needsLLM.length === 0) {
    return results;
  }

  // Second pass: LLM categorization for remaining transactions
  try {
    const categories = await getAllCategories(db, uid);

    const llmResults = await batchCategorizeWithLLM(needsLLM, categories);

    // Merge LLM results
    for (const tx of needsLLM) {
      const llmResult = llmResults.get(tx.id);

      if (llmResult && llmResult.categoryId !== null) {
        results.set(tx.id, {
          categoryId: llmResult.categoryId,
          tags: [],
          explainability: {
            reason: 'llm',
            confidence: llmResult.confidence,
            llmModel: 'claude-sonnet-4-20250514',
            llmReasoning: llmResult.reasoning,
            timestamp,
          },
          usedLLM: true,
        });
      } else if (llmResult) {
        // LLM processed but couldn't categorize - update the existing result
        const existing = results.get(tx.id);
        if (existing) {
          results.set(tx.id, {
            ...existing,
            explainability: {
              ...existing.explainability,
              llmReasoning: llmResult.reasoning,
            },
            usedLLM: true,
          });
        }
      }
    }
  } catch (error) {
    console.error('Batch LLM categorization failed:', error);
    // Keep rule-based results on error
  }

  return results;
}

/**
 * Recategorize transactions that were not manually overridden
 */
export async function recategorizeTransactions(
  db: Firestore,
  uid: string,
  transactionIds: string[],
  includeManualOverrides: boolean = false,
  options: CategorizationOptions = {}
): Promise<{
  updated: number;
  skipped: number;
  errors: number;
}> {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Load transactions
  const { Collections } = await import('./firestore.js');

  for (const txId of transactionIds) {
    try {
      const docRef = db.collection(Collections.TRANSACTIONS).doc(txId);
      const doc = await docRef.get();

      if (!doc.exists) {
        skipped++;
        continue;
      }

      const data = doc.data();
      if (!data || data.uid !== uid) {
        skipped++;
        continue;
      }

      // Skip manual overrides unless explicitly included
      if (data.manualOverride && !includeManualOverrides) {
        skipped++;
        continue;
      }

      // Recategorize
      const result = await categorizeTransaction(db, uid, {
        merchantNormalized: data.merchantNormalized as string,
        merchantRaw: data.merchantRaw as string,
        description: data.description as string,
        amount: data.amount as number,
        accountId: data.accountId as string,
      }, options);

      // Update if category changed
      const currentCategoryId = data.categoryId as string | null;
      if (result.categoryId !== currentCategoryId) {
        await docRef.update({
          categoryId: result.categoryId,
          explainability: result.explainability,
          autoCategory: {
            categoryId: result.categoryId,
            explainability: result.explainability,
            categorizedAt: result.explainability.timestamp,
          },
          updatedAt: nowTimestamp(),
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error recategorizing transaction ${txId}:`, error);
      errors++;
    }
  }

  return { updated, skipped, errors };
}
