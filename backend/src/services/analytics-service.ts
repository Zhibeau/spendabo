/**
 * Analytics Service
 * Provides monthly overview, spending breakdown, and dashboard data
 */

import type { Firestore, Query, DocumentData, Timestamp } from '@google-cloud/firestore';
import { Collections, toTimestamp, timestampToISO } from './firestore.js';
import { getAllCategories } from './transaction-service.js';

/**
 * Category spending summary
 */
export interface CategorySpending {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number; // In cents (negative for expenses)
  transactionCount: number;
  percentageOfTotal: number;
}

/**
 * Monthly overview data
 */
export interface MonthlyOverview {
  month: string; // YYYY-MM
  totalIncome: number; // In cents (positive)
  totalExpenses: number; // In cents (negative)
  netAmount: number; // In cents
  transactionCount: number;
  categorizedCount: number;
  uncategorizedCount: number;
  manualOverrideCount: number;
  categoryBreakdown: CategorySpending[];
  topMerchants: MerchantSpending[];
  dailySpending: DailySpending[];
}

/**
 * Merchant spending summary
 */
export interface MerchantSpending {
  merchantNormalized: string;
  totalAmount: number;
  transactionCount: number;
  categoryId: string | null;
  categoryName: string | null;
}

/**
 * Daily spending data point
 */
export interface DailySpending {
  date: string; // YYYY-MM-DD
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

/**
 * Spending trend comparison
 */
export interface SpendingTrend {
  currentMonth: MonthlyOverview;
  previousMonth: MonthlyOverview | null;
  percentageChange: {
    income: number | null;
    expenses: number | null;
    net: number | null;
  };
}

/**
 * Get date range for a month string (YYYY-MM)
 */
function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month format. Use YYYY-MM');
  }

  const start = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNum, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Get the previous month string
 */
function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) {
    throw new Error('Invalid month format');
  }

  let prevYear = year;
  let prevMonth = monthNum - 1;

  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Get monthly overview for a user
 */
export async function getMonthlyOverview(
  db: Firestore,
  uid: string,
  month: string,
  options: { topMerchantsLimit?: number } = {}
): Promise<MonthlyOverview> {
  const { topMerchantsLimit = 10 } = options;
  const { start, end } = getMonthDateRange(month);

  // Fetch all transactions for the month
  const snapshot = await db
    .collection(Collections.TRANSACTIONS)
    .where('uid', '==', uid)
    .where('postedAt', '>=', toTimestamp(start))
    .where('postedAt', '<=', toTimestamp(end))
    .where('isSplitParent', '==', false)
    .get();

  // Fetch categories for mapping
  const categories = await getAllCategories(db, uid);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Initialize aggregations
  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;
  let categorizedCount = 0;
  let uncategorizedCount = 0;
  let manualOverrideCount = 0;

  const categoryTotals = new Map<string | null, { amount: number; count: number }>();
  const merchantTotals = new Map<
    string,
    { amount: number; count: number; categoryId: string | null }
  >();
  const dailyTotals = new Map<
    string,
    { income: number; expenses: number; count: number }
  >();

  // Process each transaction
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const amount = data.amount as number;
    const categoryId = data.categoryId as string | null;
    const merchantNormalized = data.merchantNormalized as string;
    const manualOverride = data.manualOverride as boolean;
    const postedAt = timestampToISO(data.postedAt as Timestamp | null | undefined);

    transactionCount++;

    // Income vs Expenses
    if (amount > 0) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }

    // Categorization stats
    if (categoryId) {
      categorizedCount++;
    } else {
      uncategorizedCount++;
    }

    if (manualOverride) {
      manualOverrideCount++;
    }

    // Category breakdown
    const catKey = categoryId ?? null;
    const existing = categoryTotals.get(catKey) ?? { amount: 0, count: 0 };
    categoryTotals.set(catKey, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });

    // Merchant breakdown (only expenses)
    if (amount < 0) {
      const existingMerchant = merchantTotals.get(merchantNormalized) ?? {
        amount: 0,
        count: 0,
        categoryId: null,
      };
      merchantTotals.set(merchantNormalized, {
        amount: existingMerchant.amount + amount,
        count: existingMerchant.count + 1,
        categoryId: categoryId ?? existingMerchant.categoryId,
      });
    }

    // Daily breakdown
    if (postedAt) {
      const dateKey = postedAt.split('T')[0];
      if (dateKey) {
        const existingDaily = dailyTotals.get(dateKey) ?? {
          income: 0,
          expenses: 0,
          count: 0,
        };
        dailyTotals.set(dateKey, {
          income: existingDaily.income + (amount > 0 ? amount : 0),
          expenses: existingDaily.expenses + (amount < 0 ? amount : 0),
          count: existingDaily.count + 1,
        });
      }
    }
  }

  // Build category breakdown
  const totalAbsExpenses = Math.abs(totalExpenses);
  const categoryBreakdown: CategorySpending[] = [];

  for (const [catId, totals] of categoryTotals.entries()) {
    // Only include expense categories
    if (totals.amount >= 0) continue;

    const category = catId ? categoryMap.get(catId) : null;
    categoryBreakdown.push({
      categoryId: catId,
      categoryName: category?.name ?? 'Uncategorized',
      categoryIcon: category?.icon ?? '❓',
      categoryColor: category?.color ?? '#6B7280',
      totalAmount: totals.amount,
      transactionCount: totals.count,
      percentageOfTotal:
        totalAbsExpenses > 0 ? (Math.abs(totals.amount) / totalAbsExpenses) * 100 : 0,
    });
  }

  // Sort by absolute amount (largest expenses first)
  categoryBreakdown.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

  // Build top merchants list
  const topMerchants: MerchantSpending[] = [];
  for (const [merchant, totals] of merchantTotals.entries()) {
    const category = totals.categoryId ? categoryMap.get(totals.categoryId) : null;
    topMerchants.push({
      merchantNormalized: merchant,
      totalAmount: totals.amount,
      transactionCount: totals.count,
      categoryId: totals.categoryId,
      categoryName: category?.name ?? null,
    });
  }

  // Sort by absolute amount and limit
  topMerchants.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  topMerchants.splice(topMerchantsLimit);

  // Build daily spending array
  const dailySpending: DailySpending[] = [];
  const daysInMonth = end.getDate();
  const [year, monthNum] = month.split('-').map(Number);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daily = dailyTotals.get(dateKey) ?? { income: 0, expenses: 0, count: 0 };
    dailySpending.push({
      date: dateKey,
      income: daily.income,
      expenses: daily.expenses,
      net: daily.income + daily.expenses,
      transactionCount: daily.count,
    });
  }

  return {
    month,
    totalIncome,
    totalExpenses,
    netAmount: totalIncome + totalExpenses,
    transactionCount,
    categorizedCount,
    uncategorizedCount,
    manualOverrideCount,
    categoryBreakdown,
    topMerchants,
    dailySpending,
  };
}

/**
 * Get spending trend comparison with previous month
 */
export async function getSpendingTrend(
  db: Firestore,
  uid: string,
  month: string
): Promise<SpendingTrend> {
  const currentMonth = await getMonthlyOverview(db, uid, month);

  let previousMonth: MonthlyOverview | null = null;
  try {
    const prevMonthStr = getPreviousMonth(month);
    previousMonth = await getMonthlyOverview(db, uid, prevMonthStr);
  } catch {
    // No previous month data
  }

  const percentageChange = {
    income: null as number | null,
    expenses: null as number | null,
    net: null as number | null,
  };

  if (previousMonth) {
    if (previousMonth.totalIncome > 0) {
      percentageChange.income =
        ((currentMonth.totalIncome - previousMonth.totalIncome) /
          previousMonth.totalIncome) *
        100;
    }

    if (previousMonth.totalExpenses < 0) {
      percentageChange.expenses =
        ((Math.abs(currentMonth.totalExpenses) -
          Math.abs(previousMonth.totalExpenses)) /
          Math.abs(previousMonth.totalExpenses)) *
        100;
    }

    if (previousMonth.netAmount !== 0) {
      percentageChange.net =
        ((currentMonth.netAmount - previousMonth.netAmount) /
          Math.abs(previousMonth.netAmount)) *
        100;
    }
  }

  return {
    currentMonth,
    previousMonth,
    percentageChange,
  };
}

/**
 * Get spending by category over multiple months
 */
export async function getCategoryTrends(
  db: Firestore,
  uid: string,
  months: string[] // Array of YYYY-MM strings
): Promise<{
  months: string[];
  categories: Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      monthlyAmounts: number[];
    }
  >;
}> {
  const categories = await getAllCategories(db, uid);

  const result = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      monthlyAmounts: number[];
    }
  >();

  // Initialize result with all known categories
  for (const category of categories) {
    result.set(category.id, {
      categoryId: category.id,
      categoryName: category.name,
      monthlyAmounts: new Array<number>(months.length).fill(0),
    });
  }

  // Add uncategorized
  result.set('uncategorized', {
    categoryId: null,
    categoryName: 'Uncategorized',
    monthlyAmounts: new Array<number>(months.length).fill(0),
  });

  // Process each month
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    if (!month) continue;

    const overview = await getMonthlyOverview(db, uid, month);

    for (const spending of overview.categoryBreakdown) {
      const key = spending.categoryId ?? 'uncategorized';
      const entry = result.get(key);
      if (entry) {
        entry.monthlyAmounts[i] = spending.totalAmount;
      }
    }
  }

  return {
    months,
    categories: result,
  };
}

/**
 * Get account balances and transaction counts
 */
export async function getAccountSummary(
  db: Firestore,
  uid: string,
  month?: string
): Promise<
  Array<{
    accountId: string;
    accountName: string;
    transactionCount: number;
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
  }>
> {
  // Build query
  let query: Query<DocumentData> = db
    .collection(Collections.TRANSACTIONS)
    .where('uid', '==', uid)
    .where('isSplitParent', '==', false);

  if (month) {
    const { start, end } = getMonthDateRange(month);
    query = query
      .where('postedAt', '>=', toTimestamp(start))
      .where('postedAt', '<=', toTimestamp(end));
  }

  const snapshot = await query.get();

  // Fetch accounts
  const accountsSnapshot = await db
    .collection(Collections.ACCOUNTS)
    .where('uid', '==', uid)
    .get();

  const accountMap = new Map<
    string,
    { name: string; type: string }
  >();

  for (const doc of accountsSnapshot.docs) {
    const data = doc.data();
    accountMap.set(doc.id, {
      name: data.name as string,
      type: data.type as string,
    });
  }

  // Aggregate by account
  const accountTotals = new Map<
    string,
    { count: number; income: number; expenses: number }
  >();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const accountId = data.accountId as string;
    const amount = data.amount as number;

    const existing = accountTotals.get(accountId) ?? {
      count: 0,
      income: 0,
      expenses: 0,
    };

    accountTotals.set(accountId, {
      count: existing.count + 1,
      income: existing.income + (amount > 0 ? amount : 0),
      expenses: existing.expenses + (amount < 0 ? amount : 0),
    });
  }

  // Build result
  const result = [];
  for (const [accountId, totals] of accountTotals.entries()) {
    const account = accountMap.get(accountId);
    result.push({
      accountId,
      accountName: account?.name ?? 'Unknown Account',
      transactionCount: totals.count,
      totalIncome: totals.income,
      totalExpenses: totals.expenses,
      netAmount: totals.income + totals.expenses,
    });
  }

  // Sort by transaction count
  result.sort((a, b) => b.transactionCount - a.transactionCount);

  return result;
}
