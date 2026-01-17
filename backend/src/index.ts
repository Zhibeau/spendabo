import express from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from './config.js';
import { initializeFirebase, requireAuth, type AuthenticatedRequest } from './auth.js';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  // Load configuration
  const config = await loadConfig();

  // Initialize Firebase Admin
  initializeFirebase(config);

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.json());

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
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
