'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatCurrency, getCurrentMonth, formatMonth } from '@/lib/utils';

export default function DashboardPage() {
  const currentMonth = getCurrentMonth();

  // Placeholder data - will be replaced with API data
  const summary = {
    totalIncome: 500000, // $5,000
    totalExpenses: -325000, // -$3,250
    netAmount: 175000, // $1,750
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{formatMonth(currentMonth)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              +{formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              -{formatCurrency(Math.abs(summary.totalExpenses))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netAmount >= 0 ? 'text-income' : 'text-expense'}`}>
              {summary.netAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.netAmount))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Import your first statement to see spending breakdown
          </p>
        </CardContent>
      </Card>

      {/* Placeholder for recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No transactions yet. Import a statement to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
