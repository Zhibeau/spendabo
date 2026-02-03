/**
 * Tests for Transaction Routes
 */

import request from 'supertest';
import express, { type Express } from 'express';
import { createTransactionRoutes, createCategoryRoutes } from './transactions.js';
import type { AppConfig } from '../config.js';
import type { Firestore } from '@google-cloud/firestore';

// Mock the services
jest.mock('../services/firestore.js');
jest.mock('../services/transaction-service.js');
jest.mock('../auth.js');

// Import mocked modules
import { getFirestore } from '../services/firestore.js';
import {
  listTransactions,
  getTransaction,
  updateTransaction,
  getAllCategories,
} from '../services/transaction-service.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

describe('Transaction Routes', () => {
  let app: Express;
  let mockConfig: AppConfig;

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
    app.use(express.json());

    // Mock requireAuth middleware to inject test user
    (requireAuth as jest.Mock).mockImplementation(() => {
      return (req: AuthenticatedRequest, _res: unknown, next: () => void) => {
        req.user = { uid: 'test-user-123' };
        next();
      };
    });

    // Mock getFirestore
    (getFirestore as jest.Mock).mockReturnValue({} as Firestore);

    // Mount routes
    app.use('/api/v1/transactions', createTransactionRoutes(mockConfig));
    app.use('/api/v1/categories', createCategoryRoutes(mockConfig));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/transactions', () => {
    it('should list transactions successfully', async () => {
      const mockResult = {
        transactions: [
          {
            id: 'tx1',
            accountId: 'acc1',
            importId: 'imp1',
            postedAt: '2024-01-15T10:30:00Z',
            amount: -5000,
            description: 'Coffee Shop',
            merchantRaw: 'COFFEE SHOP NYC',
            merchantNormalized: 'COFFEE SHOP NYC',
            categoryId: 'cat1',
            categoryName: 'Dining',
            manualOverride: false,
            notes: null,
            tags: [],
            isSplitParent: false,
            splitParentId: null,
            explainability: {
              reason: 'llm',
              confidence: 0.95,
              timestamp: '2024-01-15T10:30:00Z',
              llmModel: 'claude-3',
              llmReasoning: 'Coffee purchase',
            },
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        ],
        pagination: {
          hasMore: false,
        },
      };

      (listTransactions as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/transactions')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].id).toBe('tx1');
      expect(response.body.meta.pagination.hasMore).toBe(false);

      expect(listTransactions).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-123',
        expect.objectContaining({})
      );
    });

    it('should handle query parameters correctly', async () => {
      const mockResult = {
        transactions: [],
        pagination: { hasMore: false },
      };

      (listTransactions as jest.Mock).mockResolvedValue(mockResult);

      await request(app)
        .get('/api/v1/transactions')
        .query({
          month: '2024-01',
          categoryId: 'cat1',
          minAmount: '100',
          maxAmount: '5000',
          limit: '20',
          merchant: 'Coffee',
          tags: 'business,food',
          uncategorized: 'true',
        })
        .expect(200);

      expect(listTransactions).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-123',
        expect.objectContaining({
          month: '2024-01',
          categoryId: 'cat1',
          minAmount: 100,
          maxAmount: 5000,
          limit: 20,
          merchant: 'Coffee',
          tags: 'business,food',
          uncategorized: true,
        })
      );
    });

    it('should reject invalid minAmount parameter', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ minAmount: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('minAmount');
    });

    it('should reject invalid maxAmount parameter', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ maxAmount: 'not-a-number' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('maxAmount');
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ limit: '0' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('limit must be a positive number');
    });

    it('should handle service errors', async () => {
      (listTransactions as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/transactions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/v1/transactions/:txId', () => {
    it('should get a transaction by ID', async () => {
      const mockTransaction = {
        id: 'tx1',
        accountId: 'acc1',
        importId: 'imp1',
        postedAt: '2024-01-15T10:30:00Z',
        amount: -5000,
        description: 'Coffee Shop',
        merchantRaw: 'COFFEE SHOP NYC',
        merchantNormalized: 'COFFEE SHOP NYC',
        categoryId: 'cat1',
        categoryName: 'Dining',
        manualOverride: false,
        notes: null,
        tags: [],
        isSplitParent: false,
        splitParentId: null,
        explainability: {
          reason: 'llm',
          confidence: 0.95,
          timestamp: '2024-01-15T10:30:00Z',
        },
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      (getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/v1/transactions/tx1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.id).toBe('tx1');
      expect(getTransaction).toHaveBeenCalledWith(expect.anything(), 'test-user-123', 'tx1');
    });

    it('should return 404 when transaction not found', async () => {
      (getTransaction as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/transactions/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle service errors', async () => {
      (getTransaction as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/transactions/tx1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PATCH /api/v1/transactions/:txId', () => {
    it('should update transaction successfully', async () => {
      const mockUpdatedTransaction = {
        id: 'tx1',
        accountId: 'acc1',
        importId: 'imp1',
        postedAt: '2024-01-15T10:30:00Z',
        amount: -5000,
        description: 'Coffee Shop',
        merchantRaw: 'COFFEE SHOP NYC',
        merchantNormalized: 'COFFEE SHOP NYC',
        categoryId: 'cat2',
        categoryName: 'Business',
        manualOverride: true,
        notes: 'Business meeting',
        tags: ['work', 'meeting'],
        isSplitParent: false,
        splitParentId: null,
        explainability: {
          reason: 'manual',
          confidence: 1.0,
          timestamp: '2024-01-15T10:35:00Z',
        },
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z',
      };

      (updateTransaction as jest.Mock).mockResolvedValue(mockUpdatedTransaction);

      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({
          categoryId: 'cat2',
          notes: 'Business meeting',
          tags: ['work', 'meeting'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.categoryId).toBe('cat2');
      expect(response.body.data.transaction.notes).toBe('Business meeting');
      expect(response.body.data.transaction.tags).toEqual(['work', 'meeting']);

      expect(updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-123',
        'tx1',
        expect.objectContaining({
          categoryId: 'cat2',
          notes: 'Business meeting',
          tags: ['work', 'meeting'],
        })
      );
    });

    it('should reject invalid categoryId type', async () => {
      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({ categoryId: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('categoryId must be a string');
    });

    it('should reject invalid notes type', async () => {
      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({ notes: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('notes must be a string');
    });

    it('should reject invalid tags type', async () => {
      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({ tags: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('tags must be an array');
    });

    it('should return 404 when transaction not found', async () => {
      (updateTransaction as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/v1/transactions/nonexistent')
        .send({ categoryId: 'cat1' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle validation errors from service', async () => {
      (updateTransaction as jest.Mock).mockRejectedValue(
        new Error('Notes cannot exceed 500 characters')
      );

      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({ notes: 'x'.repeat(600) })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('cannot exceed');
    });

    it('should handle service errors', async () => {
      (updateTransaction as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/api/v1/transactions/tx1')
        .send({ categoryId: 'cat1' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});

describe('Category Routes', () => {
  let app: Express;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      projectId: 'test-project',
      region: 'us-central1',
      port: 8080,
      allowLocalDevBypass: false,
      jwtAudience: 'test-project',
    };

    app = express();
    app.use(express.json());

    (requireAuth as jest.Mock).mockImplementation(() => {
      return (req: AuthenticatedRequest, _res: unknown, next: () => void) => {
        req.user = { uid: 'test-user-123' };
        next();
      };
    });

    (getFirestore as jest.Mock).mockReturnValue({} as Firestore);

    app.use('/api/v1/categories', createCategoryRoutes(mockConfig));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/categories', () => {
    it('should list all categories', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Dining',
          icon: '🍽️',
          color: '#FF5722',
          isDefault: true,
          parentId: null,
          sortOrder: 1,
        },
        {
          id: 'cat2',
          name: 'Transportation',
          icon: '🚗',
          color: '#2196F3',
          isDefault: true,
          parentId: null,
          sortOrder: 2,
        },
        {
          id: 'cat3',
          name: 'Custom Category',
          icon: '📌',
          color: '#9C27B0',
          isDefault: false,
          parentId: null,
          sortOrder: 100,
        },
      ];

      (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(3);
      expect(response.body.data.categories[0].name).toBe('Dining');
      expect(response.body.data.categories[2].isDefault).toBe(false);

      expect(getAllCategories).toHaveBeenCalledWith(expect.anything(), 'test-user-123');
    });

    it('should handle empty category list', async () => {
      (getAllCategories as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toEqual([]);
    });

    it('should handle service errors', async () => {
      (getAllCategories as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
