'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground">View and manage spending categories</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Categories will appear here once you start tracking expenses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
