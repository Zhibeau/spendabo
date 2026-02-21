export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number; // cents, negative = expense
  currency: string;
  postedAt: string; // ISO date string
  description: string;
  merchantNormalized: string;
  categoryId: string | null;
  manualOverride: boolean;
  notes: string | null;
  tags: string[];
  explainability: {
    reason: "rule_match" | "manual" | "no_match" | "default";
    ruleName?: string;
    matchType?: "exact" | "contains" | "regex";
    matchedValue?: string;
    confidence: number;
  };
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    merchantContains?: string;
    merchantExact?: string;
    descriptionContains?: string;
  };
  action: { categoryId: string };
  matchCount: number;
  source: "user" | "suggestion" | "system";
}

export interface Import {
  id: string;
  fileName: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  totalRows: number;
  importedCount: number;
  errorCount: number;
  createdAt: string;
}

export interface MonthlyAnalytics {
  month: string;
  totalSpend: number;
  totalIncome: number;
  transactionCount: number;
  vsLastMonth: number; // percentage change
  byCategory: { categoryId: string; amount: number; percentage: number }[];
  topMerchants: { name: string; amount: number; count: number }[];
}
