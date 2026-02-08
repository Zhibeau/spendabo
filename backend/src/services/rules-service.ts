/**
 * Rules Service
 * Handles CRUD operations for categorization rules and rule suggestions
 */

import type { Firestore, DocumentData, Timestamp } from '@google-cloud/firestore';
import { Collections, nowTimestamp, timestampToISO } from './firestore.js';
import type {
  Rule,
  RuleResponse,
  RuleConditions,
  RuleAction,
  CreateRuleBody,
  UpdateRuleBody,
  Transaction,
} from '../types/index.js';

const MAX_RULES_PER_USER = 100;
const DEFAULT_PRIORITY = 500;
const SUGGESTION_PRIORITY = 300;

/**
 * Convert Firestore document to Rule type
 */
function docToRule(id: string, data: DocumentData): Rule {
  return {
    id,
    uid: data.uid as string,
    name: data.name as string,
    enabled: data.enabled as boolean,
    priority: data.priority as number,
    conditions: data.conditions as unknown as RuleConditions,
    action: data.action as unknown as RuleAction,
    source: data.source as unknown as Rule['source'],
    matchCount: (data.matchCount as number) ?? 0,
    lastMatchedAt: (data.lastMatchedAt as Timestamp | null) ?? null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

/**
 * Convert Rule to API response format
 */
function toRuleResponse(rule: Rule): RuleResponse {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    conditions: rule.conditions,
    action: rule.action,
    source: rule.source,
    matchCount: rule.matchCount,
    lastMatchedAt: timestampToISO(rule.lastMatchedAt),
    createdAt: timestampToISO(rule.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToISO(rule.updatedAt) ?? new Date().toISOString(),
  };
}

/**
 * List all rules for a user
 */
export async function listRules(
  db: Firestore,
  uid: string,
  options: { enabledOnly?: boolean } = {}
): Promise<RuleResponse[]> {
  let query = db.collection(Collections.RULES).where('uid', '==', uid);

  if (options.enabledOnly) {
    query = query.where('enabled', '==', true);
  }

  const snapshot = await query.orderBy('priority', 'desc').get();

  return snapshot.docs.map((doc) => toRuleResponse(docToRule(doc.id, doc.data())));
}

/**
 * Get a single rule by ID
 */
export async function getRule(
  db: Firestore,
  uid: string,
  ruleId: string
): Promise<RuleResponse | null> {
  const doc = await db.collection(Collections.RULES).doc(ruleId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data || data.uid !== uid) {
    return null;
  }

  return toRuleResponse(docToRule(doc.id, data));
}

/**
 * Create a new rule
 */
export async function createRule(
  db: Firestore,
  uid: string,
  body: CreateRuleBody,
  source: Rule['source'] = 'user'
): Promise<RuleResponse> {
  // Check rule limit
  const existingCount = await db
    .collection(Collections.RULES)
    .where('uid', '==', uid)
    .count()
    .get();

  if (existingCount.data().count >= MAX_RULES_PER_USER) {
    throw new Error(`Maximum of ${MAX_RULES_PER_USER} rules allowed per user`);
  }

  // Validate conditions
  if (!body.conditions || Object.keys(body.conditions).length === 0) {
    throw new Error('At least one condition is required');
  }

  // Validate regex if present
  if (body.conditions.merchantRegex) {
    try {
      new RegExp(body.conditions.merchantRegex);
    } catch {
      throw new Error('Invalid regex pattern in merchantRegex');
    }
  }

  // Validate action
  if (!body.action?.categoryId) {
    throw new Error('action.categoryId is required');
  }

  const now = nowTimestamp();
  const priority = body.priority ?? (source === 'suggestion' ? SUGGESTION_PRIORITY : DEFAULT_PRIORITY);

  const ruleData = {
    uid,
    name: body.name,
    enabled: true,
    priority: Math.min(Math.max(priority, 1), 1000), // Clamp to 1-1000
    conditions: body.conditions,
    action: body.action,
    source,
    matchCount: 0,
    lastMatchedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(Collections.RULES).add(ruleData);
  const doc = await docRef.get();

  const createdData = doc.data();
  if (!createdData) {
    throw new Error('Failed to read created rule');
  }
  return toRuleResponse(docToRule(doc.id, createdData));
}

/**
 * Update an existing rule
 */
export async function updateRule(
  db: Firestore,
  uid: string,
  ruleId: string,
  body: UpdateRuleBody
): Promise<RuleResponse | null> {
  const docRef = db.collection(Collections.RULES).doc(ruleId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data || data.uid !== uid) {
    return null;
  }

  // Validate regex if present
  if (body.conditions?.merchantRegex) {
    try {
      new RegExp(body.conditions.merchantRegex);
    } catch {
      throw new Error('Invalid regex pattern in merchantRegex');
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: nowTimestamp(),
  };

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.enabled !== undefined) {
    updateData.enabled = body.enabled;
  }

  if (body.priority !== undefined) {
    updateData.priority = Math.min(Math.max(body.priority, 1), 1000);
  }

  if (body.conditions !== undefined) {
    if (Object.keys(body.conditions).length === 0) {
      throw new Error('At least one condition is required');
    }
    updateData.conditions = body.conditions;
  }

  if (body.action !== undefined) {
    if (!body.action.categoryId) {
      throw new Error('action.categoryId is required');
    }
    updateData.action = body.action;
  }

  await docRef.update(updateData);

  const updatedDoc = await docRef.get();
  const updatedData = updatedDoc.data();
  if (!updatedData) {
    throw new Error('Failed to read updated rule');
  }
  return toRuleResponse(docToRule(updatedDoc.id, updatedData));
}

/**
 * Delete a rule
 */
export async function deleteRule(
  db: Firestore,
  uid: string,
  ruleId: string
): Promise<boolean> {
  const docRef = db.collection(Collections.RULES).doc(ruleId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  const data = doc.data();
  if (!data || data.uid !== uid) {
    return false;
  }

  await docRef.delete();
  return true;
}

/**
 * Reorder rules (update priorities)
 */
export async function reorderRules(
  db: Firestore,
  uid: string,
  ruleIds: string[]
): Promise<RuleResponse[]> {
  const batch = db.batch();
  const now = nowTimestamp();

  // Assign priorities from 1000 down based on order
  for (let i = 0; i < ruleIds.length; i++) {
    const ruleId = ruleIds[i];
    if (!ruleId) continue;

    const docRef = db.collection(Collections.RULES).doc(ruleId);
    const priority = 1000 - i;

    batch.update(docRef, {
      priority,
      updatedAt: now,
    });
  }

  await batch.commit();

  // Return updated rules
  return listRules(db, uid);
}

// ============================================================================
// Rule Suggestions
// ============================================================================

export interface RuleSuggestion {
  id: string;
  message: string;
  rule: {
    name: string;
    priority: number;
    conditions: RuleConditions;
    action: RuleAction;
  };
}

/**
 * Generate a rule suggestion based on a category correction
 */
export async function generateRuleSuggestion(
  db: Firestore,
  uid: string,
  transaction: Pick<Transaction, 'merchantNormalized' | 'description'>,
  newCategoryId: string,
  categoryName: string
): Promise<RuleSuggestion | null> {
  const merchant = transaction.merchantNormalized;

  // Don't suggest if merchant is too short
  if (!merchant || merchant.length < 3) {
    return null;
  }

  // Check if similar rule already exists
  const existingRules = await db
    .collection(Collections.RULES)
    .where('uid', '==', uid)
    .get();

  for (const doc of existingRules.docs) {
    const data = doc.data();
    const conditions = data.conditions as RuleConditions;

    if (
      conditions.merchantContains?.toUpperCase() === merchant ||
      conditions.merchantExact?.toUpperCase() === merchant
    ) {
      return null; // Similar rule exists
    }
  }

  // Check if already dismissed
  const dismissedSnapshot = await db
    .collection(Collections.DISMISSED_SUGGESTIONS)
    .where('uid', '==', uid)
    .where('merchantNormalized', '==', merchant)
    .where('categoryId', '==', newCategoryId)
    .limit(1)
    .get();

  if (!dismissedSnapshot.empty) {
    return null; // Already dismissed
  }

  // Generate suggestion
  const suggestionId = `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: suggestionId,
    message: `Create rule: Merchant contains '${merchant}' → ${categoryName}?`,
    rule: {
      name: `${merchant} → ${categoryName}`,
      priority: SUGGESTION_PRIORITY,
      conditions: {
        merchantContains: merchant,
      },
      action: {
        categoryId: newCategoryId,
      },
    },
  };
}

/**
 * Dismiss a rule suggestion
 */
export async function dismissSuggestion(
  db: Firestore,
  uid: string,
  merchantNormalized: string,
  categoryId: string
): Promise<void> {
  await db.collection(Collections.DISMISSED_SUGGESTIONS).add({
    uid,
    merchantNormalized,
    categoryId,
    dismissedAt: nowTimestamp(),
  });
}

/**
 * Accept a rule suggestion (create the rule)
 */
export async function acceptSuggestion(
  db: Firestore,
  uid: string,
  suggestion: RuleSuggestion
): Promise<RuleResponse> {
  return createRule(
    db,
    uid,
    {
      name: suggestion.rule.name,
      priority: suggestion.rule.priority,
      conditions: suggestion.rule.conditions,
      action: suggestion.rule.action,
    },
    'suggestion'
  );
}
