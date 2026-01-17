import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import type { AppConfig } from './config.js';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(config: AppConfig): void {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: config.projectId,
    });
    console.info('Firebase Admin SDK initialized');
  }
}

/**
 * Middleware to verify Firebase Auth JWT and extract user information
 * Rejects requests without valid authentication (401)
 */
export function requireAuth(config: AppConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Local development bypass (disabled by default)
    if (config.allowLocalDevBypass && process.env.NODE_ENV !== 'production') {
      console.warn('WARNING: Local dev bypass enabled - skipping auth');
      req.user = {
        uid: 'local-dev-user',
        email: 'dev@localhost',
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing token',
      });
      return;
    }

    try {
      // Verify the JWT token
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Extract user information
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Optional auth middleware - does not reject unauthenticated requests
 * Use for endpoints that have different behavior for authenticated vs unauthenticated users
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      next();
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error) {
      console.warn('Optional auth: token verification failed:', error);
      // Continue without user info
    }

    next();
  };
}
