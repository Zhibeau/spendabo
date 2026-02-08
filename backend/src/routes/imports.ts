/**
 * Import Routes
 * Handles file uploads and import processing
 */

import { Router, type Response } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { getFirestore, Collections, timestampToISO } from '../services/firestore.js';
import { createImport, processImport } from '../services/import-service.js';
import type { Timestamp } from '@google-cloud/firestore';
import type { ApiResponse } from '../types/index.js';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported MIME types
const SUPPORTED_MIME_TYPES: Record<string, 'csv' | 'pdf' | 'image'> = {
  'text/csv': 'csv',
  'application/csv': 'csv',
  'text/plain': 'csv', // Some CSVs come as text/plain
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
};

/**
 * Create import routes
 */
export function createImportRoutes(config: AppConfig): Router {
  const router = Router();
  const db = getFirestore(config);

  /**
   * POST /api/v1/imports/upload
   * Upload a document for import processing
   *
   * Expects multipart/form-data with:
   * - file: The document file (CSV, PDF, or image)
   * - accountId: The account to import transactions into
   *
   * Or JSON body with:
   * - accountId: The account to import transactions into
   * - content: Base64 encoded file content
   * - filename: Original filename
   * - mimeType: MIME type of the file
   */
  router.post('/upload', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      let accountId: string;
      let filename: string;
      let mimeType: string;
      let content: string | Buffer;

      // Handle JSON body with base64 content
      if (req.is('application/json')) {
        const body = req.body as {
          accountId?: string;
          content?: string;
          filename?: string;
          mimeType?: string;
        };

        if (!body.accountId || !body.content || !body.filename || !body.mimeType) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Missing required fields: accountId, content, filename, mimeType',
            },
          };
          res.status(400).json(response);
          return;
        }

        accountId = body.accountId;
        filename = body.filename;
        mimeType = body.mimeType;

        // Decode base64 content
        try {
          content = Buffer.from(body.content, 'base64');
        } catch {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid base64 content',
            },
          };
          res.status(400).json(response);
          return;
        }
      } else {
        // For now, only support JSON body
        // Multipart file upload would require additional middleware (multer, busboy, etc.)
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'UNSUPPORTED_CONTENT_TYPE',
            message: 'Please send JSON with base64-encoded file content',
          },
        };
        res.status(415).json(response);
        return;
      }

      // Validate file size
      if (content.length > MAX_FILE_SIZE) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
        };
        res.status(413).json(response);
        return;
      }

      // Validate MIME type
      const documentType = SUPPORTED_MIME_TYPES[mimeType];
      if (!documentType) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `Unsupported file type: ${mimeType}. Supported: CSV, PDF, JPEG, PNG, WebP`,
          },
        };
        res.status(400).json(response);
        return;
      }

      // Verify account exists and belongs to user
      const accountDoc = await db.collection(Collections.ACCOUNTS).doc(accountId).get();
      if (!accountDoc.exists) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const accountData = accountDoc.data();
      if (!accountData || accountData.uid !== uid) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Create import record
      const importId = await createImport(
        db,
        uid,
        accountId,
        filename,
        documentType,
        '' // No cloud storage path for now (processing inline)
      );

      // Process the import
      // For CSV text content, convert Buffer to string
      const processContent = documentType === 'csv' ? content.toString('utf-8') : content;

      const result = await processImport(
        db,
        uid,
        accountId,
        importId,
        processContent,
        documentType,
        mimeType
      );

      if (!result.success) {
        const response: ApiResponse<{
          importId: string;
          created: number;
          skipped: number;
          errors: string[];
        }> = {
          success: false,
          data: {
            importId,
            created: result.created,
            skipped: result.skipped,
            errors: result.errors,
          },
          error: {
            code: 'IMPORT_FAILED',
            message: result.errors[0] ?? 'Import processing failed',
          },
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<{
        importId: string;
        created: number;
        skipped: number;
        errors: string[];
      }> = {
        success: true,
        data: {
          importId,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error processing import:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process import',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/imports
   * List user's imports
   */
  router.get('/', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }

      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      const snapshot = await db
        .collection(Collections.IMPORTS)
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const imports = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          accountId: data.accountId as string,
          filename: data.filename as string,
          fileType: data.fileType as string,
          status: data.status as string,
          transactionCount: data.transactionCount as number,
          errorMessage: data.errorMessage as string | null,
          createdAt: timestampToISO(data.createdAt as Timestamp | null),
          completedAt: timestampToISO(data.completedAt as Timestamp | null),
        };
      });

      const response: ApiResponse<{ imports: typeof imports }> = {
        success: true,
        data: { imports },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing imports:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list imports',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/v1/imports/:importId
   * Get import details
   */
  router.get('/:importId', requireAuth(config), async (req, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;
      if (!uid) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }); return; }
      const { importId } = req.params;

      if (!importId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Import ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      const doc = await db.collection(Collections.IMPORTS).doc(importId).get();

      if (!doc.exists) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Import not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const data = doc.data();
      if (!data || data.uid !== uid) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Import not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const importData = {
        id: doc.id,
        accountId: data.accountId as string,
        filename: data.filename as string,
        fileType: data.fileType as string,
        status: data.status as string,
        transactionCount: data.transactionCount as number,
        errorMessage: data.errorMessage as string | null,
        createdAt: timestampToISO(data.createdAt as Timestamp | null),
        completedAt: timestampToISO(data.completedAt as Timestamp | null),
      };

      const response: ApiResponse<{ import: typeof importData }> = {
        success: true,
        data: { import: importData },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting import:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get import',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
