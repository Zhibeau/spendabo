/**
 * Rules Routes
 * CRUD operations for categorization rules
 */

import { Router, type Response } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { getFirestore } from '../services/firestore.js';
import type { ApiResponse, RuleResponse, CreateRuleBody, UpdateRuleBody } from '../types/index.js';
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  dismissSuggestion,
  acceptSuggestion,
} from '../services/rules-service.js';

/**
 * Create rules routes
 */
export function createRulesRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * GET /api/v1/rules
   * List all rules for the authenticated user
   */
  router.get('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const enabledOnly = req.query.enabledOnly === 'true';
      const rules = await listRules(db, uid, { enabledOnly });

      const response: ApiResponse<{ rules: RuleResponse[] }> = {
        success: true,
        data: { rules },
      };
      res.json(response);
    } catch (error) {
      console.error('Error listing rules:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list rules' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/rules/:ruleId
   * Get a specific rule
   */
  router.get('/:ruleId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const ruleId = req.params.ruleId;
      if (!ruleId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'Rule ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      const rule = await getRule(db, uid, ruleId);

      if (!rule) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Rule not found' },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ rule: RuleResponse }> = {
        success: true,
        data: { rule },
      };
      res.json(response);
    } catch (error) {
      console.error('Error getting rule:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get rule' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/rules
   * Create a new rule
   */
  router.post('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const body = req.body as CreateRuleBody;

      // Validate required fields
      if (!body.name || !body.conditions || !body.action?.categoryId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: name, conditions, and action.categoryId are required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Validate at least one condition is set
      const hasCondition =
        body.conditions.merchantExact ||
        body.conditions.merchantContains ||
        body.conditions.merchantRegex ||
        body.conditions.descriptionContains ||
        body.conditions.amountMin !== undefined ||
        body.conditions.amountMax !== undefined ||
        body.conditions.accountId;

      if (!hasCondition) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'At least one condition must be specified',
          },
        };
        res.status(400).json(response);
        return;
      }

      const rule = await createRule(db, uid, body);

      const response: ApiResponse<{ rule: RuleResponse }> = {
        success: true,
        data: { rule },
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating rule:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create rule' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PATCH /api/v1/rules/:ruleId
   * Update a rule
   */
  router.patch('/:ruleId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const ruleId = req.params.ruleId;
      if (!ruleId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'Rule ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      const body = req.body as UpdateRuleBody;

      const rule = await updateRule(db, uid, ruleId, body);

      if (!rule) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Rule not found' },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ rule: RuleResponse }> = {
        success: true,
        data: { rule },
      };
      res.json(response);
    } catch (error) {
      console.error('Error updating rule:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update rule' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/v1/rules/:ruleId
   * Delete a rule
   */
  router.delete('/:ruleId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const ruleId = req.params.ruleId;
      if (!ruleId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'Rule ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      const deleted = await deleteRule(db, uid, ruleId);

      if (!deleted) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Rule not found' },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
      };
      res.json(response);
    } catch (error) {
      console.error('Error deleting rule:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete rule' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/rules/reorder
   * Reorder rule priorities
   */
  router.post('/reorder', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const { ruleIds } = req.body as { ruleIds: string[] };

      if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ruleIds must be a non-empty array',
          },
        };
        res.status(400).json(response);
        return;
      }

      await reorderRules(db, uid, ruleIds);

      const response: ApiResponse<{ reordered: boolean }> = {
        success: true,
        data: { reordered: true },
      };
      res.json(response);
    } catch (error) {
      console.error('Error reordering rules:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder rules' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/rules/suggestions/dismiss
   * Dismiss a rule suggestion for a merchant/category combination
   */
  router.post('/suggestions/dismiss', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const { merchantNormalized, categoryId } = req.body as {
        merchantNormalized: string;
        categoryId: string;
      };

      if (!merchantNormalized || !categoryId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'merchantNormalized and categoryId are required',
          },
        };
        res.status(400).json(response);
        return;
      }

      await dismissSuggestion(db, uid, merchantNormalized, categoryId);

      const response: ApiResponse<{ dismissed: boolean }> = {
        success: true,
        data: { dismissed: true },
      };
      res.json(response);
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to dismiss suggestion' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/rules/suggestions/accept
   * Accept a rule suggestion and create the rule
   */
  router.post('/suggestions/accept', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user!.uid;

      const { suggestion } = req.body as {
        suggestion: {
          id: string;
          message: string;
          rule: {
            name: string;
            priority: number;
            conditions: Record<string, unknown>;
            action: { categoryId: string };
          };
        };
      };

      if (!suggestion?.id || !suggestion?.rule?.name || !suggestion?.rule?.action?.categoryId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Valid suggestion object with rule details is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const rule = await acceptSuggestion(db, uid, suggestion);

      const response: ApiResponse<{ rule: RuleResponse }> = {
        success: true,
        data: { rule },
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to accept suggestion' },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
