import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { initializeFirebase, requireAuth, type AuthenticatedRequest } from './auth.js';
import { createTransactionRoutes, createCategoryRoutes } from './routes/transactions.js';
import { createImportRoutes } from './routes/imports.js';
import { createRulesRoutes } from './routes/rules.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createAccountRoutes } from './routes/accounts.js';

/**
 * Main application entry point
 */
function main(): void {
  // Load configuration
  const config = loadConfig();

  // Initialize Firebase Admin
  initializeFirebase(config);

  // Create Express app
  const app = express();

  // CORS — allow frontend origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const corsOriginEnv = process.env.CORS_ALLOWED_ORIGIN;
  if (corsOriginEnv) {
    allowedOrigins.push(corsOriginEnv);
  }
  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));

  // Middleware
  app.use(express.json({ limit: '15mb' })); // Increased limit for file uploads

  // Request logging
  app.use((req, _res, next) => {
    console.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Health check endpoint (no auth - Cloud Run probes need to access this)
  app.get('/healthz', (_req, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes (all require authentication)
  app.get('/api/v1/me', requireAuth(config), (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    res.status(200).json({
      user: authReq.user,
    });
  });

  // Example authenticated endpoint
  app.get('/api/v1/status', requireAuth(config), (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    res.status(200).json({
      message: 'API is running',
      user: authReq.user,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount route modules
  app.use('/api/v1/transactions', createTransactionRoutes(config));
  app.use('/api/v1/categories', createCategoryRoutes(config));
  app.use('/api/v1/imports', createImportRoutes(config));
  app.use('/api/v1/rules', createRulesRoutes(config));
  app.use('/api/v1/analytics', createAnalyticsRoutes(config));
  app.use('/api/v1/accounts', createAccountRoutes(config));

  // 404 handler
  app.use((_req, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource does not exist',
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  // Start server
  app.listen(config.port, () => {
    console.info(`Server listening on port ${config.port}`);
    console.info(`Project: ${config.projectId}`);
    console.info(`Region: ${config.region}`);
    console.info(`Local dev bypass: ${config.allowLocalDevBypass ? 'ENABLED (INSECURE)' : 'DISABLED'}`);
  });
}

// Run the application
try {
  main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
