/**
 * Firestore client singleton and helper utilities
 */

import { Firestore, Timestamp } from '@google-cloud/firestore';
import type { AppConfig } from '../config.js';

let firestoreInstance: Firestore | null = null;

/**
 * Get or create Firestore instance
 */
export function getFirestore(config: AppConfig): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = new Firestore({
      projectId: config.projectId,
    });
    console.info('Firestore client initialized');
  }
  return firestoreInstance;
}

/**
 * Collection names
 */
export const Collections = {
  USERS: 'users',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  RULES: 'rules',
  IMPORTS: 'imports',
  MERCHANTS: 'merchants',
  DISMISSED_SUGGESTIONS: 'dismissedSuggestions',
} as const;

/**
 * Create a Firestore timestamp from a Date
 */
export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Get current timestamp
 */
export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

/**
 * Convert Timestamp to ISO string for API responses
 */
export function timestampToISO(timestamp: Timestamp | null | undefined): string | null {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
}

/**
 * Parse a cursor string for pagination
 * Cursor format: base64 encoded JSON { postedAt: ISO string, id: string }
 */
export function parseCursor(cursor: string | undefined): { postedAt: Date; id: string } | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { postedAt?: string; id?: string };

    if (!parsed.postedAt || !parsed.id) {
      return null;
    }

    return {
      postedAt: new Date(parsed.postedAt),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

/**
 * Create a cursor string for pagination
 */
export function createCursor(postedAt: Timestamp, id: string): string {
  const data = {
    postedAt: postedAt.toDate().toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}
