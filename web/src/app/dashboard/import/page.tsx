'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import</h1>
        <p className="text-muted-foreground">Upload bank statements and receipts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>Supported formats: CSV, PDF, and images (receipts)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Max file size: 10MB
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
