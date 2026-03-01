import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import { CATEGORIES } from "./mockData";
import type { Category, MonthlyAnalytics, Transaction } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txCol(uid: string) {
  return collection(db(), "users", uid, "transactions");
}

function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    start: `${month}-01T00:00:00.000Z`,
    end: `${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`,
  };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(filters?: {
  month?: string;
  categoryId?: string;
  uncategorized?: boolean;
}): Promise<Transaction[]> {
  const user = getAuth().currentUser;
  if (!user) return [];

  let q;
  if (filters?.month) {
    const { start, end } = monthRange(filters.month);
    q = query(
      txCol(user.uid),
      where("postedAt", ">=", start),
      where("postedAt", "<=", end),
      orderBy("postedAt", "desc")
    );
  } else {
    q = query(txCol(user.uid), orderBy("postedAt", "desc"), limit(200));
  }

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));

  if (filters?.categoryId) {
    results = results.filter((t) => t.categoryId === filters.categoryId);
  }
  if (filters?.uncategorized) {
    results = results.filter((t) => t.categoryId === null);
  }

  return results;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db(), "users", user.uid, "transactions", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Transaction;
}

export async function updateTransaction(
  id: string,
  patch: { categoryId?: string | null; notes?: string; tags?: string[] }
): Promise<Transaction> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = doc(db(), "users", user.uid, "transactions", id);
  await updateDoc(ref, { ...patch, manualOverride: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Transaction;
}

// ─── Categories (static list) ─────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

// ─── Analytics (computed from Firestore transactions) ─────────────────────────

export async function getMonthlyAnalytics(month?: string): Promise<MonthlyAnalytics> {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);
  const transactions = await getTransactions({ month: targetMonth });
  return computeMonthlyAnalytics(transactions, targetMonth);
}

function computeMonthlyAnalytics(
  transactions: Transaction[],
  month: string
): MonthlyAnalytics {
  const expenses = transactions.filter((t) => t.amount < 0);
  const income = transactions.filter((t) => t.amount > 0);

  const totalSpend = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const byCat: Record<string, number> = {};
  expenses.forEach((t) => {
    const cat = t.categoryId ?? "uncategorized";
    byCat[cat] = (byCat[cat] ?? 0) + Math.abs(t.amount);
  });
  const byCategory = Object.entries(byCat)
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top merchants
  const byMerchant: Record<string, { amount: number; count: number }> = {};
  expenses.forEach((t) => {
    const m = t.merchantNormalized || t.description;
    if (!byMerchant[m]) byMerchant[m] = { amount: 0, count: 0 };
    byMerchant[m].amount += Math.abs(t.amount);
    byMerchant[m].count += 1;
  });
  const topMerchants = Object.entries(byMerchant)
    .map(([name, { amount, count }]) => ({ name, amount, count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    month,
    totalSpend,
    totalIncome,
    transactionCount: transactions.length,
    vsLastMonth: 0,
    byCategory,
    topMerchants,
  };
}
