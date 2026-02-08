'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">View and manage your transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
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
