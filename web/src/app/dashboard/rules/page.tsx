'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rules</h1>
          <p className="text-muted-foreground">Manage auto-categorization rules</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No rules yet. Create rules to automatically categorize transactions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
