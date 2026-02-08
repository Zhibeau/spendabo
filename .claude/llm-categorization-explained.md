# LLM Categorization Service - Technical Explanation

This document explains how the LLM-based categorization and receipt parsing works in Spendabo.

## Overview

The `llm-categorization-service.ts` provides intelligent transaction categorization and document parsing using either:
- **Anthropic Claude** (claude-sonnet-4)
- **Google Vertex AI Gemini** (gemini-2.5-flash)

## Core Capabilities

### 1. Transaction Categorization

Categorizes individual bank/credit card transactions into spending categories.

**Input:**
```typescript
{
  description: "AMZN Mktp US*AB12CD34",
  merchantRaw: "AMZN Mktp US*AB12CD34",
  amount: -4599,  // cents, negative = expense
  categories: [{ id: "shopping", name: "Shopping" }, ...]
}
```

**Output:**
```typescript
{
  categoryId: "shopping",
  categoryName: "Shopping",
  confidence: 0.95,
  reasoning: "AMZN indicates Amazon marketplace purchase"
}
```

### 2. Document Parsing (Bank Statements)

Extracts transactions from CSV or PDF bank statements.

**Input:** Raw CSV/PDF content
**Output:** Array of parsed transactions with dates, amounts, descriptions

### 3. Receipt Parsing with Line Items

**This is the key feature for expense distribution.**

When parsing receipt images, the LLM extracts:
1. **Overall transaction** - single expense record
2. **Individual line items** - each item on the receipt with suggested categories

## Receipt Line Item Structure

```typescript
interface ReceiptLineItem {
  name: string;        // "Milk 2% Gallon"
  quantity: number;    // 1
  unitPrice: number;   // 499 (cents)
  totalPrice: number;  // 499 (cents)
  category?: string;   // "dairy"
}

interface ParsedReceipt {
  merchantName: string;      // "Walmart"
  merchantAddress?: string;  // "123 Main St, City, State"
  date: Date;
  lineItems: ReceiptLineItem[];
  subtotal: number;          // cents
  tax?: number;              // cents
  tip?: number;              // cents
  total: number;             // cents
  paymentMethod?: string;    // "VISA *1234"
}
```

## Category Suggestions for Line Items

The LLM suggests categories based on item names:

| Item Type | Suggested Categories |
|-----------|---------------------|
| Food items | `groceries`, `produce`, `dairy`, `meat`, `frozen`, `bakery`, `snacks`, `beverages` |
| Non-food | `household`, `personal care`, `pharmacy`, `cleaning`, `pet supplies` |
| Restaurant | `dining`, `fast food`, `coffee` |
| Other | `electronics`, `clothing`, `entertainment`, `office supplies` |

## Example: Walmart Receipt

**Input:** Photo of Walmart receipt

**Output:**
```json
{
  "transactions": [{
    "postedAt": "2024-01-15",
    "amount": -4523,
    "description": "Walmart Supercenter Purchase",
    "merchantRaw": "Walmart"
  }],
  "receipt": {
    "merchantName": "Walmart Supercenter",
    "merchantAddress": "1234 Commerce Dr, Springfield, IL",
    "date": "2024-01-15",
    "lineItems": [
      { "name": "Great Value Milk 2%", "quantity": 1, "unitPrice": 329, "totalPrice": 329, "category": "dairy" },
      { "name": "Bananas", "quantity": 1, "unitPrice": 158, "totalPrice": 158, "category": "produce" },
      { "name": "Tide Pods 42ct", "quantity": 1, "unitPrice": 1299, "totalPrice": 1299, "category": "household" },
      { "name": "Advil 24ct", "quantity": 1, "unitPrice": 899, "totalPrice": 899, "category": "pharmacy" },
      { "name": "Doritos Nacho", "quantity": 2, "unitPrice": 349, "totalPrice": 698, "category": "snacks" }
    ],
    "subtotal": 3383,
    "tax": 271,
    "total": 3654,
    "paymentMethod": "VISA *4521"
  },
  "metadata": {
    "documentType": "image",
    "totalRows": 5,
    "parsedRows": 5,
    "errors": []
  }
}
```

## How to Use Line Items for Category Distribution

Once you have the parsed receipt with line items, you can:

### Option 1: Auto-distribute by suggested category
```typescript
const result = await parseDocumentWithLLM(receiptImage, 'image');

if (result.receipt) {
  for (const item of result.receipt.lineItems) {
    // Map LLM category suggestion to your category IDs
    const categoryId = mapSuggestedCategory(item.category);

    // Create split transaction or tag
    await createSplitTransaction({
      parentId: mainTransactionId,
      amount: -item.totalPrice,
      categoryId,
      description: item.name
    });
  }
}
```

### Option 2: Present to user for review
```typescript
// Show user the breakdown for manual adjustment
const breakdown = result.receipt.lineItems.map(item => ({
  name: item.name,
  amount: formatCurrency(item.totalPrice),
  suggestedCategory: item.category,
  // User can override
}));
```

### Option 3: Aggregate by category
```typescript
// Group line items by category for summary
const byCategory = result.receipt.lineItems.reduce((acc, item) => {
  const cat = item.category || 'uncategorized';
  acc[cat] = (acc[cat] || 0) + item.totalPrice;
  return acc;
}, {});

// Result: { dairy: 329, produce: 158, household: 1299, pharmacy: 899, snacks: 698 }
```

## Configuration

Set LLM provider via environment variables:

```bash
# Use Vertex AI (default, recommended for GCP deployments)
LLM_PROVIDER=vertexai
VERTEX_MODEL=gemini-2.5-flash
GCP_PROJECT_ID=your-project

# Or use Anthropic Claude
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Amount Convention

All amounts are in **cents** (integer):
- `$12.34` → `1234`
- Expenses are **negative**: `-1234`
- Income is **positive**: `1234`

This avoids floating-point precision issues.

## Error Handling

The service returns graceful fallbacks on failure:
- Empty transactions array
- Error messages in `metadata.errors`
- Confidence of `0` for failed categorizations
