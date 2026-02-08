/**
 * Account Routes
 * Handles listing and creating bank/credit card accounts
 */

import { Router, type Response } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { getFirestore, Collections, nowTimestamp, timestampToISO } from '../services/firestore.js';
import type { Timestamp } from '@google-cloud/firestore';
import type { ApiResponse } from '../types/index.js';

/**
 * Create account routes
 */
export function createAccountRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * GET /api/v1/accounts
   * List the authenticated user's accounts
   */
  router.get('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const snapshot = await db
        .collection(Collections.ACCOUNTS)
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      const accounts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name as string,
          type: data.type as string,
          institution: (data.institution as string) || null,
          lastFour: (data.lastFour as string) || null,
          createdAt: timestampToISO(data.createdAt as Timestamp | null),
        };
      });

      const response: ApiResponse<{ accounts: typeof accounts }> = {
        success: true,
        data: { accounts },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing accounts:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list accounts',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/v1/accounts
   * Create a new account
   */
  router.post('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const body = req.body as {
        name?: string;
        type?: string;
        institution?: string;
        lastFour?: string;
      };

      if (!body.name || !body.type) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: name, type',
          },
        };
        res.status(400).json(response);
        return;
      }

      const validTypes = ['checking', 'savings', 'credit', 'investment', 'other'];
      if (!validTypes.includes(body.type)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: `Invalid account type. Must be one of: ${validTypes.join(', ')}`,
          },
        };
        res.status(400).json(response);
        return;
      }

      const now = nowTimestamp();
      const docRef = db.collection(Collections.ACCOUNTS).doc();

      await docRef.set({
        uid,
        name: body.name.trim(),
        type: body.type,
        institution: body.institution?.trim() || null,
        lastFour: body.lastFour?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });

      const response: ApiResponse<{
        id: string;
        name: string;
        type: string;
        institution: string | null;
        lastFour: string | null;
        createdAt: string | null;
      }> = {
        success: true,
        data: {
          id: docRef.id,
          name: body.name.trim(),
          type: body.type,
          institution: body.institution?.trim() || null,
          lastFour: body.lastFour?.trim() || null,
          createdAt: timestampToISO(now),
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating account:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
