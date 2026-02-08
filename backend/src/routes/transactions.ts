/**
 * Transaction Routes
 * Handles all /api/v1/transactions endpoints
 */

import { Router, type Response } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { getFirestore } from '../services/firestore.js';
import {
  listTransactions,
  getTransaction,
  updateTransaction,
  getAllCategories,
} from '../services/transaction-service.js';
import {
  splitTransaction,
  unsplitTransaction,
  getSplitChildren,
} from '../services/splits-service.js';
import { generateRuleSuggestion, type RuleSuggestion } from '../services/rules-service.js';
import type {
  ApiResponse,
  TransactionResponse,
  ListTransactionsQuery,
  UpdateTransactionBody,
  SplitTransactionBody,
  CategoryResponse,
} from '../types/index.js';

/**
 * Create transaction routes
 */
export function createTransactionRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * GET /api/v1/transactions
   * List transactions with filtering and pagination
   */
  router.get('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      // Parse query parameters
      const query: ListTransactionsQuery = {
        month: req.query.month as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        accountId: req.query.accountId as string | undefined,
        merchant: req.query.merchant as string | undefined,
        tags: req.query.tags as string | undefined,
        cursor: req.query.cursor as string | undefined,
      };

      // Parse numeric parameters
      if (req.query.minAmount) {
        query.minAmount = parseInt(req.query.minAmount as string, 10);
        if (isNaN(query.minAmount)) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'minAmount must be a valid number',
            },
          };
          res.status(400).json(response);
          return;
        }
      }

      if (req.query.maxAmount) {
        query.maxAmount = parseInt(req.query.maxAmount as string, 10);
        if (isNaN(query.maxAmount)) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'maxAmount must be a valid number',
            },
          };
          res.status(400).json(response);
          return;
        }
      }

      if (req.query.limit) {
        query.limit = parseInt(req.query.limit as string, 10);
        if (isNaN(query.limit) || query.limit < 1) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'limit must be a positive number',
            },
          };
          res.status(400).json(response);
          return;
        }
      }

      if (req.query.uncategorized === 'true') {
        query.uncategorized = true;
      }

      const result = await listTransactions(db, uid, query);

      const response: ApiResponse<{ transactions: TransactionResponse[] }> = {
        success: true,
        data: {
          transactions: result.transactions,
        },
        meta: {
          pagination: result.pagination,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing transactions:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list transactions',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/transactions/:txId
   * Get a single transaction by ID
   */
  router.get('/:txId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { txId } = req.params;

      if (!txId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Transaction ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const transaction = await getTransaction(db, uid, txId);

      if (!transaction) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ transaction: TransactionResponse }> = {
        success: true,
        data: {
          transaction,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting transaction:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get transaction',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PATCH /api/v1/transactions/:txId
   * Update a transaction (category, notes, tags)
   */
  router.patch('/:txId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { txId } = req.params;
      const body = req.body as UpdateTransactionBody;

      if (!txId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Transaction ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Validate body
      if (body.categoryId !== undefined && typeof body.categoryId !== 'string') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'categoryId must be a string',
          },
        };
        res.status(400).json(response);
        return;
      }

      if (body.notes !== undefined && typeof body.notes !== 'string') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'notes must be a string',
          },
        };
        res.status(400).json(response);
        return;
      }

      if (body.tags !== undefined && !Array.isArray(body.tags)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'tags must be an array of strings',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Get the old transaction to check if category changed
      const oldTransaction = await getTransaction(db, uid, txId);

      const transaction = await updateTransaction(db, uid, txId, body);

      if (!transaction) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Generate rule suggestion if category was changed manually
      let ruleSuggestion: RuleSuggestion | null = null;

      if (
        body.categoryId !== undefined &&
        oldTransaction &&
        oldTransaction.categoryId !== body.categoryId
      ) {
        try {
          // Get category name for suggestion
          const categories = await getAllCategories(db, uid);
          const category = categories.find((c) => c.id === body.categoryId);

          if (category) {
            ruleSuggestion = await generateRuleSuggestion(
              db,
              uid,
              {
                merchantNormalized: transaction.merchantNormalized,
                description: transaction.description,
              },
              body.categoryId,
              category.name
            );
          }
        } catch (suggestionError) {
          console.warn('Failed to generate rule suggestion:', suggestionError);
        }
      }

      const response: ApiResponse<{
        transaction: TransactionResponse;
        ruleSuggestion?: RuleSuggestion | null;
      }> = {
        success: true,
        data: {
          transaction,
          ruleSuggestion,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating transaction:', error);

      // Handle validation errors
      if (error instanceof Error && error.message.includes('cannot exceed')) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update transaction',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/transactions/:txId/split
   * Split a transaction into multiple parts
   */
  router.post('/:txId/split', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { txId } = req.params;
      const body = req.body as SplitTransactionBody;

      if (!txId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Transaction ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Validate splits array
      if (!Array.isArray(body.splits) || body.splits.length < 2) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'At least 2 splits are required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Validate each split has an amount
      for (const split of body.splits) {
        if (typeof split.amount !== 'number') {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Each split must have a numeric amount',
            },
          };
          res.status(400).json(response);
          return;
        }
      }

      const result = await splitTransaction(db, uid, txId, body);

      if (!result) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error splitting transaction:', error);

      // Handle validation errors
      if (error instanceof Error) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to split transaction',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/transactions/:txId/unsplit
   * Unsplit a transaction (delete children, restore parent)
   */
  router.post('/:txId/unsplit', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { txId } = req.params;

      if (!txId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Transaction ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const result = await unsplitTransaction(db, uid, txId);

      if (!result) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error unsplitting transaction:', error);

      // Handle validation errors
      if (error instanceof Error && error.message.includes('not split')) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unsplit transaction',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/transactions/:txId/splits
   * Get split children of a transaction
   */
  router.get('/:txId/splits', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { txId } = req.params;

      if (!txId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Transaction ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const splits = await getSplitChildren(db, uid, txId);

      const response: ApiResponse<{
        splits: Array<{
          id: string;
          amount: number;
          categoryId: string | null;
          notes: string | null;
        }>;
      }> = {
        success: true,
        data: { splits },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting split children:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get split children',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}

/**
 * Create category routes
 */
export function createCategoryRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * GET /api/v1/categories
   * List all categories (default + user-created)
   */
  router.get('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      const categories = await getAllCategories(db, uid);

      const response: ApiResponse<{ categories: CategoryResponse[] }> = {
        success: true,
        data: {
          categories,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing categories:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list categories',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
