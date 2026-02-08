/**
 * Analytics Routes
 * Provides monthly overview, spending breakdown, and dashboard data
 */

import { Router, type Response } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { getFirestore } from '../services/firestore.js';
import {
  getMonthlyOverview,
  getSpendingTrend,
  getCategoryTrends,
  getAccountSummary,
  type MonthlyOverview,
  type SpendingTrend,
} from '../services/analytics-service.js';
import type { ApiResponse } from '../types/index.js';

/**
 * Create analytics routes
 */
export function createAnalyticsRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * GET /api/v1/analytics/monthly
   * Get monthly overview for a specific month
   */
  router.get('/monthly', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      // Parse month parameter (defaults to current month)
      let month = req.query.month as string | undefined;
      if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Month must be in YYYY-MM format',
          },
        };
        res.status(400).json(response);
        return;
      }

      const overview = await getMonthlyOverview(db, uid, month);

      const response: ApiResponse<MonthlyOverview> = {
        success: true,
        data: overview,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting monthly overview:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get monthly overview',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/analytics/trend
   * Get spending trend comparison with previous month
   */
  router.get('/trend', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      // Parse month parameter (defaults to current month)
      let month = req.query.month as string | undefined;
      if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Month must be in YYYY-MM format',
          },
        };
        res.status(400).json(response);
        return;
      }

      const trend = await getSpendingTrend(db, uid, month);

      const response: ApiResponse<SpendingTrend> = {
        success: true,
        data: trend,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting spending trend:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get spending trend',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/analytics/categories
   * Get category spending over multiple months
   */
  router.get('/categories', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      // Parse months parameter
      const monthsParam = req.query.months as string | undefined;
      let months: string[];

      if (monthsParam) {
        months = monthsParam.split(',').map((m) => m.trim());
      } else {
        // Default to last 6 months
        const now = new Date();
        months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          );
        }
      }

      // Validate month formats
      for (const month of months) {
        if (!/^\d{4}-\d{2}$/.test(month)) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: `Invalid month format: ${month}. Use YYYY-MM format`,
            },
          };
          res.status(400).json(response);
          return;
        }
      }

      const trends = await getCategoryTrends(db, uid, months);

      // Convert Map to array for JSON serialization
      const categoriesArray = Array.from(trends.categories.values());

      const response: ApiResponse<{
        months: string[];
        categories: typeof categoriesArray;
      }> = {
        success: true,
        data: {
          months: trends.months,
          categories: categoriesArray,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting category trends:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get category trends',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/analytics/accounts
   * Get account summaries with transaction counts and totals
   */
  router.get('/accounts', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      // Optional month filter
      const month = req.query.month as string | undefined;

      if (month && !/^\d{4}-\d{2}$/.test(month)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Month must be in YYYY-MM format',
          },
        };
        res.status(400).json(response);
        return;
      }

      const accounts = await getAccountSummary(db, uid, month);

      const response: ApiResponse<{
        accounts: typeof accounts;
      }> = {
        success: true,
        data: { accounts },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting account summary:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get account summary',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
