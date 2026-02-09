'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Receipt, ChevronDown, ChevronRight } from 'lucide-react';
import { cn, formatAmount, formatCurrency, formatDate, getCurrentMonth, formatMonth } from '@/lib/utils';
import { api } from '@/lib/api/client';

interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

interface TransactionResponse {
  id: string;
  accountId: string;
  importId: string;
  postedAt: string;
  amount: number;
  description: string;
  merchantRaw: string;
  merchantNormalized: string;
  categoryId: string | null;
  categoryName?: string;
  manualOverride: boolean;
  notes: string | null;
  tags: string[];
  isSplitParent: boolean;
  splitParentId: string | null;
  receiptLineItems: ReceiptLineItem[] | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  lastFour: string | null;
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Fetch accounts for filter dropdown
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await api.get<{ accounts: Account[] }>('/api/v1/accounts');
        if (response.data?.accounts) {
          setAccounts(response.data.accounts);
        }
      } catch {
        // Non-critical
      }
    }
    fetchAccounts();
  }, []);

  // Fetch transactions when filters change
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selectedMonth) params.set('month', selectedMonth);
        if (selectedAccountId) params.set('accountId', selectedAccountId);
        params.set('limit', '50');

        const queryString = params.toString();
        const endpoint = `/api/v1/transactions${queryString ? `?${queryString}` : ''}`;

        const response = await api.get<{ transactions: TransactionResponse[] }>(endpoint);

        setTransactions(response.data?.transactions ?? []);
        setCursor(response.meta?.pagination?.cursor);
        setHasMore(response.meta?.pagination?.hasMore ?? false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [selectedMonth, selectedAccountId, fetchKey]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);
      if (selectedAccountId) params.set('accountId', selectedAccountId);
      params.set('limit', '50');
      params.set('cursor', cursor);

      const response = await api.get<{ transactions: TransactionResponse[] }>(
        `/api/v1/transactions?${params.toString()}`
      );

      const newTransactions = response.data?.transactions ?? [];
      setTransactions((prev) => [...prev, ...newTransactions]);
      setCursor(response.meta?.pagination?.cursor);
      setHasMore(response.meta?.pagination?.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, selectedMonth, selectedAccountId]);

  const recentMonths = getRecentMonths(12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">View and manage your transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex h-10 w-full sm:w-48 appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All time</option>
            {recentMonths.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>

        {accounts.length > 0 && (
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="flex h-10 w-full sm:w-56 appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}{account.institution ? ` (${account.institution})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMonth ? `${formatMonth(selectedMonth)} Transactions` : 'All Transactions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setError(null);
                  setFetchKey((k) => k + 1);
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No transactions found{selectedMonth ? ` for ${formatMonth(selectedMonth)}` : ''}.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try selecting a different month or import a statement.
              </p>
            </div>
          )}

          {/* Transaction list */}
          {!loading && transactions.length > 0 && (
            <>
              <div className="divide-y">
                {transactions.map((tx) => {
                  const hasLineItems = tx.receiptLineItems && tx.receiptLineItems.length > 0;
                  const isExpanded = expandedTxId === tx.id;

                  return (
                    <div key={tx.id}>
                      <div
                        className={cn(
                          'flex items-center justify-between py-3 gap-4',
                          hasLineItems && 'cursor-pointer hover:bg-muted/50 rounded -mx-2 px-2'
                        )}
                        onClick={hasLineItems ? () => setExpandedTxId(isExpanded ? null : tx.id) : undefined}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {hasLineItems && (
                            <ChevronRight className={cn(
                              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                              isExpanded && 'rotate-90'
                            )} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(tx.postedAt)}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {tx.merchantNormalized || tx.merchantRaw || tx.description}
                              </span>
                              {hasLineItems && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  ({tx.receiptLineItems!.length} items)
                                </span>
                              )}
                            </div>
                            {tx.description && tx.description !== (tx.merchantNormalized || tx.merchantRaw) && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {tx.description}
                              </p>
                            )}
                            {tx.categoryName && (
                              <span className="inline-block text-xs bg-muted rounded px-1.5 py-0.5 mt-1">
                                {tx.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          'text-sm font-medium whitespace-nowrap',
                          tx.amount >= 0 ? 'text-income' : 'text-expense'
                        )}>
                          {formatAmount(tx.amount)}
                        </div>
                      </div>

                      {/* Expanded line items */}
                      {isExpanded && tx.receiptLineItems && (
                        <div className="ml-6 mb-3 border-l-2 border-muted pl-4 space-y-1.5">
                          {tx.receiptLineItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs gap-4">
                              <div className="flex-1 min-w-0">
                                <span className="text-foreground">
                                  {item.name}
                                  {item.quantity > 1 && (
                                    <span className="text-muted-foreground"> x{item.quantity}</span>
                                  )}
                                </span>
                                {item.category && (
                                  <span className="ml-2 text-muted-foreground bg-muted rounded px-1 py-0.5">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    loading={loadingMore}
                    disabled={loadingMore}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
