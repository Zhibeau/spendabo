/**
 * Tests for Import Routes
 */

import request from 'supertest';
import express, { type Express } from 'express';
import { createImportRoutes } from './imports.js';
import type { AppConfig } from '../config.js';
import type { Firestore } from '@google-cloud/firestore';

// Mock the services
jest.mock('../services/firestore.js');
jest.mock('../services/import-service.js');
jest.mock('../auth.js');

// Import mocked modules
import { getFirestore } from '../services/firestore.js';
import { createImport, processImport } from '../services/import-service.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

describe('Import Routes', () => {
  let app: Express;
  let mockConfig: AppConfig;
  let mockCollection: {
    doc: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
  };
  let mockDoc: {
    get: jest.Mock;
  };
  let mockQuery: {
    get: jest.Mock;
  };

  beforeEach(() => {
    // Setup mock config
    mockConfig = {
      projectId: 'test-project',
      region: 'us-central1',
      port: 8080,
      allowLocalDevBypass: false,
      jwtAudience: 'test-project',
    };

    // Setup Express app with routes
    app = express();
    app.use(express.json({ limit: '50mb' }));

    // Mock requireAuth middleware
    (requireAuth as jest.Mock).mockImplementation(() => {
      return (req: AuthenticatedRequest, _res: unknown, next: () => void) => {
        req.user = { uid: 'test-user-123' };
        next();
      };
    });

    // Mock Firestore with proper chaining
    mockDoc = {
      get: jest.fn(),
    };

    mockQuery = {
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // Make mockCollection.get available for queries
    (mockCollection as Record<string, unknown>)['get'] = mockQuery.get;

    const mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    } as unknown as Firestore;

    (getFirestore as jest.Mock).mockReturnValue(mockDb);

    // Mount routes
    app.use('/api/v1/imports', createImportRoutes(mockConfig));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/imports/upload', () => {
    it('should successfully upload and process a CSV file', async () => {
      // Mock account verification
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      // Mock import creation
      (createImport as jest.Mock).mockResolvedValue('import123');

      // Mock successful processing
      (processImport as jest.Mock).mockResolvedValue({
        success: true,
        created: 5,
        skipped: 0,
        errors: [],
      });

      const csvContent = Buffer.from('date,amount,description\n2024-01-15,-50.00,Coffee').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content: csvContent,
          filename: 'transactions.csv',
          mimeType: 'text/csv',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importId).toBe('import123');
      expect(response.body.data.created).toBe(5);
      expect(response.body.data.skipped).toBe(0);

      expect(createImport).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-123',
        'acc123',
        'transactions.csv',
        'csv',
        ''
      );

      expect(processImport).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-123',
        'acc123',
        'import123',
        expect.any(String),
        'csv',
        'text/csv'
      );
    });

    it('should successfully upload and process a PDF file', async () => {
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      (createImport as jest.Mock).mockResolvedValue('import456');
      (processImport as jest.Mock).mockResolvedValue({
        success: true,
        created: 3,
        skipped: 1,
        errors: [],
      });

      const pdfContent = Buffer.from('%PDF-1.4 fake pdf content').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content: pdfContent,
          filename: 'statement.pdf',
          mimeType: 'application/pdf',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(3);
      expect(response.body.data.skipped).toBe(1);
    });

    it('should successfully upload and process an image file', async () => {
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      (createImport as jest.Mock).mockResolvedValue('import789');
      (processImport as jest.Mock).mockResolvedValue({
        success: true,
        created: 1,
        skipped: 0,
        errors: [],
      });

      const imageContent = Buffer.from('fake image data').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content: imageContent,
          filename: 'receipt.jpg',
          mimeType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(1);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          filename: 'test.csv',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should handle invalid base64 content gracefully', async () => {
      // Note: Buffer.from() in Node.js is lenient and doesn't throw on invalid base64
      // It will decode what it can. This test verifies the endpoint handles any content.

      // Mock account to get past that check
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      (createImport as jest.Mock).mockResolvedValue('import-test');
      (processImport as jest.Mock).mockResolvedValue({
        success: true,
        created: 0,
        skipped: 0,
        errors: [],
      });

      // Even with "invalid" looking base64, Buffer.from will process it
      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content: 'not-valid-base64!!!',
          filename: 'test.csv',
          mimeType: 'text/csv',
        })
        .expect(201);

      // The endpoint processes it without crashing
      expect(response.body.success).toBe(true);
    });

    it('should reject unsupported content type header', async () => {
      const response = await request(app)
        .post('/api/v1/imports/upload')
        .set('Content-Type', 'multipart/form-data')
        .send('some data')
        .expect(415);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
    });

    it('should reject files that are too large', async () => {
      const largeContent = Buffer.alloc(11 * 1024 * 1024).toString('base64'); // 11MB

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content: largeContent,
          filename: 'large.csv',
          mimeType: 'text/csv',
        })
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should reject unsupported file types', async () => {
      const content = Buffer.from('test').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content,
          filename: 'test.exe',
          mimeType: 'application/x-msdownload',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should reject when account does not exist', async () => {
      const mockAccountDoc = {
        exists: false,
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      const content = Buffer.from('test').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'nonexistent',
          content,
          filename: 'test.csv',
          mimeType: 'text/csv',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should reject when account belongs to different user', async () => {
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'different-user', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      const content = Buffer.from('test').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content,
          filename: 'test.csv',
          mimeType: 'text/csv',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should handle partial import failures', async () => {
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      (createImport as jest.Mock).mockResolvedValue('import999');
      (processImport as jest.Mock).mockResolvedValue({
        success: false,
        created: 2,
        skipped: 3,
        errors: ['Invalid date format on row 3', 'Missing amount on row 5'],
      });

      const content = Buffer.from('test').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content,
          filename: 'test.csv',
          mimeType: 'text/csv',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('IMPORT_FAILED');
      expect(response.body.data.created).toBe(2);
      expect(response.body.data.skipped).toBe(3);
      expect(response.body.data.errors).toHaveLength(2);
    });

    it('should handle service errors', async () => {
      const mockAccountDoc = {
        exists: true,
        data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
      };
      mockDoc.get.mockResolvedValue(mockAccountDoc as never);

      (createImport as jest.Mock).mockRejectedValue(new Error('Database error'));

      const content = Buffer.from('test').toString('base64');

      const response = await request(app)
        .post('/api/v1/imports/upload')
        .send({
          accountId: 'acc123',
          content,
          filename: 'test.csv',
          mimeType: 'text/csv',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/v1/imports', () => {
    it('should list user imports', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'imp1',
            data: () => ({
              accountId: 'acc1',
              filename: 'transactions.csv',
              fileType: 'csv',
              status: 'completed',
              transactionCount: 10,
              errorMessage: null,
              createdAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
              completedAt: { toDate: () => new Date('2024-01-15T10:01:00Z') },
            }),
          },
          {
            id: 'imp2',
            data: () => ({
              accountId: 'acc1',
              filename: 'statement.pdf',
              fileType: 'pdf',
              status: 'processing',
              transactionCount: 0,
              errorMessage: null,
              createdAt: { toDate: () => new Date('2024-01-16T09:00:00Z') },
              completedAt: null,
            }),
          },
        ],
      };

      mockQuery.get.mockResolvedValue(mockSnapshot as never);

      const response = await request(app)
        .get('/api/v1/imports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imports).toHaveLength(2);
      expect(response.body.data.imports[0].id).toBe('imp1');
      expect(response.body.data.imports[0].status).toBe('completed');
      expect(response.body.data.imports[1].status).toBe('processing');
    });

    it('should respect limit parameter', async () => {
      const mockSnapshot = { docs: [] };
      mockQuery.get.mockResolvedValue(mockSnapshot as never);

      await request(app)
        .get('/api/v1/imports')
        .query({ limit: '10' })
        .expect(200);

      expect(mockCollection.limit).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 100', async () => {
      const mockSnapshot = { docs: [] };
      mockQuery.get.mockResolvedValue(mockSnapshot as never);

      await request(app)
        .get('/api/v1/imports')
        .query({ limit: '200' })
        .expect(200);

      expect(mockCollection.limit).toHaveBeenCalledWith(100);
    });

    it('should handle empty import list', async () => {
      const mockSnapshot = { docs: [] };
      mockQuery.get.mockResolvedValue(mockSnapshot as never);

      const response = await request(app)
        .get('/api/v1/imports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imports).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockQuery.get.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/imports')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/v1/imports/:importId', () => {
    it('should get import details', async () => {
      const mockDocData = {
        exists: true,
        id: 'imp1',
        data: () => ({
          uid: 'test-user-123',
          accountId: 'acc1',
          filename: 'transactions.csv',
          fileType: 'csv',
          status: 'completed',
          transactionCount: 10,
          errorMessage: null,
          createdAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
          completedAt: { toDate: () => new Date('2024-01-15T10:01:00Z') },
        }),
      };

      mockDoc.get.mockResolvedValue(mockDocData as never);

      const response = await request(app)
        .get('/api/v1/imports/imp1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.import.id).toBe('imp1');
      expect(response.body.data.import.filename).toBe('transactions.csv');
      expect(response.body.data.import.status).toBe('completed');
    });

    it('should return 404 when import does not exist', async () => {
      const mockDocData = {
        exists: false,
      };

      mockDoc.get.mockResolvedValue(mockDocData as never);

      const response = await request(app)
        .get('/api/v1/imports/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when import belongs to different user', async () => {
      const mockDocData = {
        exists: true,
        data: () => ({
          uid: 'different-user',
          accountId: 'acc1',
          filename: 'transactions.csv',
        }),
      };

      mockDoc.get.mockResolvedValue(mockDocData as never);

      const response = await request(app)
        .get('/api/v1/imports/imp1')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle service errors', async () => {
      mockDoc.get.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/imports/imp1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
