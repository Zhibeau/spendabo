/**
 * Rule-Based Categorization Engine
 * Implements priority-based rule matching with explainability
 */

import type { Firestore } from '@google-cloud/firestore';
import { Collections } from './firestore.js';
import type {
  Rule,
  RuleConditions,
  RuleMatchResult,
  CategorizationResult,
  Transaction,
} from '../types/index.js';

/**
 * Get confidence score based on match type
 */
function getConfidence(matchType: RuleMatchResult['matchType']): number {
  switch (matchType) {
    case 'exact':
      return 1.0;
    case 'contains':
      return 0.8;
    case 'regex':
      return 0.6;
    case 'description':
      return 0.5;
    default:
      return 0;
  }
}

/**
 * Check if a transaction matches a rule's conditions
 */
function matchRule(
  transaction: Pick<Transaction, 'merchantNormalized' | 'description' | 'amount' | 'accountId'>,
  conditions: RuleConditions
): RuleMatchResult {
  // Check account filter first (if specified)
  if (conditions.accountId && transaction.accountId !== conditions.accountId) {
    return { matched: false };
  }

  // Check amount range (if specified)
  if (conditions.amountMin !== undefined && transaction.amount < conditions.amountMin) {
    return { matched: false };
  }
  if (conditions.amountMax !== undefined && transaction.amount > conditions.amountMax) {
    return { matched: false };
  }

  // Try exact merchant match (highest priority within a rule)
  if (conditions.merchantExact) {
    const pattern = conditions.merchantExact.toUpperCase();
    if (transaction.merchantNormalized === pattern) {
      return {
        matched: true,
        matchType: 'exact',
        matchedValue: transaction.merchantNormalized,
        matchedPattern: pattern,
      };
    }
  }

  // Try contains merchant match
  if (conditions.merchantContains) {
    const pattern = conditions.merchantContains.toUpperCase();
    if (transaction.merchantNormalized.includes(pattern)) {
      return {
        matched: true,
        matchType: 'contains',
        matchedValue: transaction.merchantNormalized,
        matchedPattern: pattern,
      };
    }
  }

  // Try regex merchant match
  if (conditions.merchantRegex) {
    try {
      const regex = new RegExp(conditions.merchantRegex, 'i');
      const match = transaction.merchantNormalized.match(regex);
      if (match) {
        return {
          matched: true,
          matchType: 'regex',
          matchedValue: match[0],
          matchedPattern: conditions.merchantRegex,
        };
      }
    } catch (error) {
      // Invalid regex, skip this condition
      console.warn(`Invalid regex in rule: ${conditions.merchantRegex}`, error);
    }
  }

  // Try description contains match
  if (conditions.descriptionContains) {
    const pattern = conditions.descriptionContains.toUpperCase();
    if (transaction.description.toUpperCase().includes(pattern)) {
      return {
        matched: true,
        matchType: 'description',
        matchedValue: transaction.description,
        matchedPattern: pattern,
      };
    }
  }

  return { matched: false };
}

/**
 * Categorize a transaction using rules
 * Rules are evaluated in priority order (highest first)
 * First matching rule wins
 */
export function categorizeWithRules(
  transaction: Pick<Transaction, 'merchantNormalized' | 'description' | 'amount' | 'accountId'>,
  rules: Rule[]
): CategorizationResult {
  // Sort rules by priority descending (higher priority first)
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const match = matchRule(transaction, rule.conditions);

    if (match.matched) {
      return {
        categoryId: rule.action.categoryId,
        tags: rule.action.addTags ?? [],
        explainability: {
          reason: 'rule_match',
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: match.matchType,
          matchedValue: match.matchedValue,
          matchedPattern: match.matchedPattern,
          confidence: getConfidence(match.matchType),
        },
      };
    }
  }

  // No match
  return {
    categoryId: null,
    tags: [],
    explainability: {
      reason: 'no_match',
      confidence: 0,
    },
  };
}

/**
 * Load rules for a user from Firestore
 */
export async function loadUserRules(db: Firestore, uid: string): Promise<Rule[]> {
  const snapshot = await db
    .collection(Collections.RULES)
    .where('uid', '==', uid)
    .where('enabled', '==', true)
    .orderBy('priority', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid as string,
      name: data.name as string,
      enabled: data.enabled as boolean,
      priority: data.priority as number,
      conditions: data.conditions as RuleConditions,
      action: data.action as Rule['action'],
      source: data.source as Rule['source'],
      matchCount: data.matchCount as number,
      lastMatchedAt: data.lastMatchedAt ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

/**
 * Update rule match statistics
 */
export async function updateRuleStats(
  db: Firestore,
  ruleId: string
): Promise<void> {
  const docRef = db.collection(Collections.RULES).doc(ruleId);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) return;

    const currentCount = (doc.data()?.matchCount as number) ?? 0;
    transaction.update(docRef, {
      matchCount: currentCount + 1,
      lastMatchedAt: new Date(),
    });
  });
}

/**
 * Validate a regex pattern (prevent ReDoS)
 */
export function validateRegex(pattern: string): { valid: boolean; error?: string } {
  if (pattern.length > 200) {
    return { valid: false, error: 'Regex pattern too long (max 200 characters)' };
  }

  // Check for common ReDoS patterns
  const redosPatterns = [
    /\(\.\*\)\+/,      // (.*)+
    /\(\.\+\)\+/,      // (.+)+
    /\(\[^]+\)\+/,     // ([^...]+)+
    /\(\.\*\)\*/,      // (.*)*
    /\(\.\+\)\*/,      // (.+)*
  ];

  for (const redos of redosPatterns) {
    if (redos.test(pattern)) {
      return { valid: false, error: 'Regex pattern may cause performance issues' };
    }
  }

  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid regex: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Sort rules by priority (for display)
 */
export function sortRulesByPriority(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

/**
 * Suggest a new rule based on a user's category correction
 */
export function suggestRuleFromCorrection(
  transaction: Pick<Transaction, 'merchantNormalized' | 'description'>,
  newCategoryId: string,
  existingRules: Rule[]
): {
  suggested: boolean;
  rule?: {
    name: string;
    priority: number;
    conditions: RuleConditions;
    action: Rule['action'];
  };
  reason?: string;
} {
  const merchant = transaction.merchantNormalized;

  // Don't suggest if merchant is too short
  if (!merchant || merchant.length < 3) {
    return {
      suggested: false,
      reason: 'Merchant name too short to create rule',
    };
  }

  // Don't suggest if similar rule already exists
  const existingRule = existingRules.find(
    (r) =>
      r.conditions.merchantContains?.toUpperCase() === merchant ||
      r.conditions.merchantExact?.toUpperCase() === merchant
  );

  if (existingRule) {
    return {
      suggested: false,
      reason: `Similar rule already exists: ${existingRule.name}`,
    };
  }

  // Generate suggestion
  return {
    suggested: true,
    rule: {
      name: `${merchant} → Category`,
      priority: 300, // Default priority for suggested rules
      conditions: {
        merchantContains: merchant,
      },
      action: {
        categoryId: newCategoryId,
      },
    },
  };
}
