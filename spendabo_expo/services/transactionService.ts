import { TRANSACTIONS, CATEGORIES, MONTHLY_ANALYTICS } from "./mockData";
import type { Transaction, Category, MonthlyAnalytics } from "../types";

// TODO: Replace with real API calls to Cloud Run backend
// All endpoints require Authorization: Bearer <idToken>

export async function getTransactions(filters?: {
  month?: string;
  categoryId?: string;
  uncategorized?: boolean;
}): Promise<Transaction[]> {
  // TODO: GET /api/transactions
  let results = [...TRANSACTIONS];
  if (filters?.categoryId) {
    results = results.filter((t) => t.categoryId === filters.categoryId);
  }
  if (filters?.uncategorized) {
    results = results.filter((t) => t.categoryId === null);
  }
  return results;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  // TODO: GET /api/transactions/:id
  return TRANSACTIONS.find((t) => t.id === id) ?? null;
}

export async function updateTransaction(
  id: string,
  patch: { categoryId?: string | null; notes?: string; tags?: string[] }
): Promise<Transaction> {
  // TODO: PATCH /api/transactions/:id
  const tx = TRANSACTIONS.find((t) => t.id === id);
  if (!tx) throw new Error("Transaction not found");
  return { ...tx, ...patch, manualOverride: true };
}

export async function getCategories(): Promise<Category[]> {
  // TODO: GET /api/categories
  return CATEGORIES;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export async function getMonthlyAnalytics(month?: string): Promise<MonthlyAnalytics> {
  // TODO: GET /api/analytics/monthly?month=YYYY-MM
  return MONTHLY_ANALYTICS;
}
