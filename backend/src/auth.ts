import type { Request, Response, NextFunction, RequestHandler } from 'express';
import admin from 'firebase-admin';
import type { AppConfig } from './config.js';

// Authenticated user attached to request
export interface AuthenticatedUser {
  uid: string;
  email?: string | undefined;
}

// Extend Express Request type to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
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
export function requireAuth(config: AppConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    // Local development bypass (disabled by default)
    if (config.allowLocalDevBypass && process.env.NODE_ENV !== 'production') {
      console.warn('WARNING: Local dev bypass enabled - skipping auth');
      authReq.user = {
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

    // Verify the JWT token
    admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        // Extract user information
        authReq.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
        };
        next();
      })
      .catch((error: unknown) => {
        console.error('Token verification failed:', error);
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      });
  };
}

/**
 * Optional auth middleware - does not reject unauthenticated requests
 * Use for endpoints that have different behavior for authenticated vs unauthenticated users
 */
export function optionalAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
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

    admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        authReq.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
        };
        next();
      })
      .catch((error: unknown) => {
        console.warn('Optional auth: token verification failed:', error);
        // Continue without user info
        next();
      });
  };
}
