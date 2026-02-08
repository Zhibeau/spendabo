/**
 * LLM Categorization Service
 * Supports both Claude (Anthropic) and Gemini (Vertex AI) for intelligent transaction categorization
 * Supports multimodal input for receipts and bank statements
 */

import Anthropic from '@anthropic-ai/sdk';
import { VertexAI, GenerativeModel, Content, Part } from '@google-cloud/vertexai';
import type {
  LLMCategorizationRequest,
  LLMCategorizationResponse,
  CategoryResponse,
  DocumentParseResult,
  LLMConfig,
  LLMProvider,
} from '../types/index.js';

// ============================================================================
// Configuration
// ============================================================================

// Default configuration - can be overridden via environment variables
const defaultConfig: LLMConfig = {
  provider: (process.env.LLM_PROVIDER as LLMProvider) || 'vertexai',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  vertexProjectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  vertexLocation: process.env.VERTEX_LOCATION || 'us-central1',
  vertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-flash',
};

let currentConfig: LLMConfig = { ...defaultConfig };

/**
 * Configure the LLM provider
 */
export function configureLLM(config: Partial<LLMConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  // Reset clients when config changes
  anthropicClient = null;
  vertexModel = null;
}

/**
 * Get current LLM configuration
 */
export function getLLMConfig(): LLMConfig {
  return { ...currentConfig };
}

// ============================================================================
// Client Initialization
// ============================================================================

// Anthropic client (lazy initialized)
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

// Vertex AI client (lazy initialized)
let vertexAI: VertexAI | null = null;
let vertexModel: GenerativeModel | null = null;

function getVertexModel(): GenerativeModel {
  if (!vertexModel) {
    if (!currentConfig.vertexProjectId) {
      throw new Error(
        'Vertex AI project ID not configured. Set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable.'
      );
    }

    vertexAI = new VertexAI({
      project: currentConfig.vertexProjectId,
      location: currentConfig.vertexLocation || 'us-central1',
    });

    vertexModel = vertexAI.getGenerativeModel({
      model: currentConfig.vertexModel || 'gemini-2.5-flash',
    });
  }
  return vertexModel;
}

// ============================================================================
// System Prompts
// ============================================================================

const CATEGORIZATION_SYSTEM_PROMPT = `You are a financial transaction categorization expert. Your job is to categorize bank and credit card transactions into the most appropriate category.

Guidelines:
1. Analyze the merchant name, description, and amount to determine the category
2. Be precise - categorize based on what the transaction actually is, not what it could be
3. Consider the amount when ambiguous (e.g., small grocery store amounts are likely groceries, large amounts might be general shopping)
4. Common patterns:
   - "AMZN", "AMAZON" -> Shopping (unless clearly a specific category like groceries)
   - "UBER", "LYFT" -> Transportation
   - "SPOTIFY", "NETFLIX", "DISNEY+" -> Subscriptions/Entertainment
   - "STARBUCKS", restaurant names -> Food & Dining
   - Gas stations -> Transportation/Auto
   - "TRANSFER", "ZELLE", "VENMO" -> Transfers
5. If uncertain, choose the most likely category with lower confidence
6. Provide clear reasoning for your choice

Always respond with valid JSON matching the expected schema.`;

const DOCUMENT_PARSE_SYSTEM_PROMPT = `You are a financial document parsing expert. Your job is to extract transaction data from various document formats including:
- CSV bank statements
- PDF bank statements
- Receipt images (photos of physical receipts)
- Digital receipt screenshots

For bank statements (CSV/PDF), extract each transaction with:
1. Date (posted date or transaction date)
2. Amount (negative for expenses/debits, positive for income/credits)
3. Description (the full transaction description)
4. Merchant name (the vendor/merchant if identifiable)

For receipts/images, extract BOTH the overall transaction AND individual line items:
1. Overall receipt info: merchant name, date, subtotal, tax, tip, total
2. Individual line items: each item purchased with name, quantity, unit price, total price
3. Suggest a spending category for each line item (e.g., "groceries", "household", "personal care", "snacks", "beverages", "dairy", "meat", "produce", "frozen", "pharmacy", "electronics", "clothing", "restaurant", "entertainment")

Guidelines:
- Parse ALL amounts as cents (multiply dollars by 100)
- Use negative amounts for expenses/debits, positive for income/credits
- Extract the raw merchant name as it appears
- If a date is ambiguous, use the most likely interpretation
- For receipts: extract EVERY individual line item visible for category distribution
- Categorize line items based on the item name (e.g., "Milk 2%" -> "dairy", "Advil" -> "pharmacy")

Always respond with valid JSON matching the expected schema.`;

// ============================================================================
// Response Parsing Utilities
// ============================================================================

/**
 * Extract JSON from LLM response text (handles markdown code blocks)
 */
function extractJSON(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  return jsonText.trim();
}

// ============================================================================
// Anthropic (Claude) Implementation
// ============================================================================

async function categorizeWithAnthropic(
  request: LLMCategorizationRequest
): Promise<LLMCategorizationResponse> {
  const client = getAnthropicClient();

  const categoryList = request.categories
    .map((c) => `- "${c.id}": ${c.name}`)
    .join('\n');

  const userPrompt = `Categorize this transaction:

Merchant: ${request.merchantRaw}
Description: ${request.description}
Amount: $${(Math.abs(request.amount) / 100).toFixed(2)} ${request.amount < 0 ? '(expense)' : '(income)'}

Available categories:
${categoryList}

Respond with JSON in this exact format:
{
  "categoryId": "the_category_id_or_null",
  "categoryName": "the_category_name_or_null",
  "confidence": 0.0_to_1.0,
  "reasoning": "brief explanation of why this category was chosen"
}`;

  const response = await client.messages.create({
    model: currentConfig.anthropicModel || 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: CATEGORIZATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  if (!textBlock) {
    throw new Error('No text response from Claude');
  }

  return JSON.parse(extractJSON(textBlock.text)) as LLMCategorizationResponse;
}

async function parseDocumentWithAnthropic(
  content: string | Buffer,
  documentType: 'csv' | 'pdf' | 'image',
  mimeType?: string
): Promise<DocumentParseResult> {
  const client = getAnthropicClient();

  // Different prompts for receipts vs bank statements
  const isReceipt = documentType === 'image';

  const userPrompt = isReceipt
    ? `Parse this receipt image and extract ALL individual line items for category distribution.

Respond with JSON in this exact format:
{
  "transactions": [
    {
      "postedAt": "YYYY-MM-DD",
      "amount": -1234,
      "description": "Full transaction description",
      "merchantRaw": "Merchant name"
    }
  ],
  "receipt": {
    "merchantName": "Store Name",
    "merchantAddress": "123 Main St, City, State",
    "date": "YYYY-MM-DD",
    "lineItems": [
      {
        "name": "Item name as shown on receipt",
        "quantity": 1,
        "unitPrice": 299,
        "totalPrice": 299,
        "category": "groceries"
      }
    ],
    "subtotal": 1500,
    "tax": 120,
    "tip": 0,
    "total": 1620,
    "paymentMethod": "VISA *1234"
  },
  "metadata": {
    "totalRows": 10,
    "parsedRows": 10,
    "errors": ["any parsing errors or warnings"]
  }
}

Important:
- Extract EVERY line item visible on the receipt
- Amounts should be in cents (e.g., $12.34 = 1234)
- Use negative amounts for the transaction (it's an expense)
- Parse dates as YYYY-MM-DD format
- Suggest a category for each line item based on what the item is:
  - Food items: "groceries", "produce", "dairy", "meat", "frozen", "bakery", "snacks", "beverages"
  - Non-food: "household", "personal care", "pharmacy", "cleaning", "pet supplies"
  - Restaurant items: "dining", "fast food", "coffee"
  - Other: "electronics", "clothing", "entertainment", "office supplies"`
    : `Parse this ${documentType} document and extract all financial transactions.

Respond with JSON in this exact format:
{
  "transactions": [
    {
      "postedAt": "YYYY-MM-DD",
      "amount": -1234,
      "description": "Full transaction description",
      "merchantRaw": "Merchant name"
    }
  ],
  "metadata": {
    "totalRows": 10,
    "parsedRows": 10,
    "errors": ["any parsing errors or warnings"]
  }
}

Important:
- Amounts should be in cents (e.g., $12.34 = 1234 or -1234 for expenses)
- Use negative amounts for expenses/debits
- Use positive amounts for income/credits
- Parse dates as YYYY-MM-DD format
- Include ALL transactions visible in the document`;

  let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

  if (documentType === 'csv' && typeof content === 'string') {
    messageContent = `${userPrompt}\n\nCSV Content:\n\`\`\`\n${content}\n\`\`\``;
  } else if (documentType === 'image' || documentType === 'pdf') {
    const base64Content = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content, 'utf-8').toString('base64');

    const mediaType = mimeType ?? (documentType === 'pdf' ? 'application/pdf' : 'image/jpeg');

    messageContent = [
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64Content,
        },
      },
      { type: 'text' as const, text: userPrompt },
    ];
  } else {
    const textContent = typeof content === 'string' ? content : content.toString('utf-8');
    messageContent = `${userPrompt}\n\nDocument Content:\n\`\`\`\n${textContent}\n\`\`\``;
  }

  const response = await client.messages.create({
    model: currentConfig.anthropicModel || 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: DOCUMENT_PARSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: messageContent }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  if (!textBlock) {
    throw new Error('No text response from Claude');
  }

  const result = JSON.parse(extractJSON(textBlock.text)) as {
    transactions: Array<{
      postedAt: string;
      amount: number;
      description: string;
      merchantRaw: string;
    }>;
    receipt?: {
      merchantName: string;
      merchantAddress?: string;
      date: string;
      lineItems: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        category?: string;
      }>;
      subtotal: number;
      tax?: number;
      tip?: number;
      total: number;
      paymentMethod?: string;
    };
    metadata: { totalRows: number; parsedRows: number; errors: string[] };
  };

  const parseResult: DocumentParseResult = {
    transactions: result.transactions.map((tx) => ({
      postedAt: new Date(tx.postedAt),
      amount: tx.amount,
      description: tx.description,
      merchantRaw: tx.merchantRaw,
    })),
    metadata: {
      documentType,
      totalRows: result.metadata.totalRows,
      parsedRows: result.metadata.parsedRows,
      errors: result.metadata.errors,
    },
  };

  // Include receipt line items if present (for receipts/images)
  if (result.receipt) {
    parseResult.receipt = {
      merchantName: result.receipt.merchantName,
      merchantAddress: result.receipt.merchantAddress,
      date: new Date(result.receipt.date),
      lineItems: result.receipt.lineItems,
      subtotal: result.receipt.subtotal,
      tax: result.receipt.tax,
      tip: result.receipt.tip,
      total: result.receipt.total,
      paymentMethod: result.receipt.paymentMethod,
    };
  }

  return parseResult;
}

async function normalizeMerchantWithAnthropic(merchantRaw: string): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: currentConfig.anthropicModel || 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Extract the merchant/company name from this transaction description. Return ONLY the clean merchant name in uppercase, nothing else.

Transaction: "${merchantRaw}"

Examples:
- "SQ *STARBUCKS #12345 SEATTLE" -> "STARBUCKS"
- "AMZN Mktp US*AB12CD34" -> "AMAZON"
- "UBER *EATS" -> "UBER EATS"
- "TST* JOE'S PIZZA NYC" -> "JOE'S PIZZA"`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  if (textBlock) {
    return textBlock.text.trim().toUpperCase();
  }
  throw new Error('No text response from Claude');
}

// ============================================================================
// Vertex AI (Gemini) Implementation
// ============================================================================

async function categorizeWithVertexAI(
  request: LLMCategorizationRequest
): Promise<LLMCategorizationResponse> {
  const model = getVertexModel();

  const categoryList = request.categories
    .map((c) => `- "${c.id}": ${c.name}`)
    .join('\n');

  const userPrompt = `${CATEGORIZATION_SYSTEM_PROMPT}

Categorize this transaction:

Merchant: ${request.merchantRaw}
Description: ${request.description}
Amount: $${(Math.abs(request.amount) / 100).toFixed(2)} ${request.amount < 0 ? '(expense)' : '(income)'}

Available categories:
${categoryList}

Respond with JSON in this exact format:
{
  "categoryId": "the_category_id_or_null",
  "categoryName": "the_category_name_or_null",
  "confidence": 0.0_to_1.0,
  "reasoning": "brief explanation of why this category was chosen"
}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.1,
    },
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini');
  }

  return JSON.parse(extractJSON(text)) as LLMCategorizationResponse;
}

async function parseDocumentWithVertexAI(
  content: string | Buffer,
  documentType: 'csv' | 'pdf' | 'image',
  mimeType?: string
): Promise<DocumentParseResult> {
  const model = getVertexModel();

  // Different prompts for receipts vs bank statements
  const isReceipt = documentType === 'image';

  const userPrompt = isReceipt
    ? `${DOCUMENT_PARSE_SYSTEM_PROMPT}

Parse this receipt image and extract ALL individual line items for category distribution.

Respond with JSON in this exact format:
{
  "transactions": [
    {
      "postedAt": "YYYY-MM-DD",
      "amount": -1234,
      "description": "Full transaction description",
      "merchantRaw": "Merchant name"
    }
  ],
  "receipt": {
    "merchantName": "Store Name",
    "merchantAddress": "123 Main St, City, State",
    "date": "YYYY-MM-DD",
    "lineItems": [
      {
        "name": "Item name as shown on receipt",
        "quantity": 1,
        "unitPrice": 299,
        "totalPrice": 299,
        "category": "groceries"
      }
    ],
    "subtotal": 1500,
    "tax": 120,
    "tip": 0,
    "total": 1620,
    "paymentMethod": "VISA *1234"
  },
  "metadata": {
    "totalRows": 10,
    "parsedRows": 10,
    "errors": ["any parsing errors or warnings"]
  }
}

Important:
- Extract EVERY line item visible on the receipt
- Amounts should be in cents (e.g., $12.34 = 1234)
- Use negative amounts for the transaction (it's an expense)
- Parse dates as YYYY-MM-DD format
- Suggest a category for each line item based on what the item is:
  - Food items: "groceries", "produce", "dairy", "meat", "frozen", "bakery", "snacks", "beverages"
  - Non-food: "household", "personal care", "pharmacy", "cleaning", "pet supplies"
  - Restaurant items: "dining", "fast food", "coffee"
  - Other: "electronics", "clothing", "entertainment", "office supplies"`
    : `${DOCUMENT_PARSE_SYSTEM_PROMPT}

Parse this ${documentType} document and extract all financial transactions.

Respond with JSON in this exact format:
{
  "transactions": [
    {
      "postedAt": "YYYY-MM-DD",
      "amount": -1234,
      "description": "Full transaction description",
      "merchantRaw": "Merchant name"
    }
  ],
  "metadata": {
    "totalRows": 10,
    "parsedRows": 10,
    "errors": ["any parsing errors or warnings"]
  }
}

Important:
- Amounts should be in cents (e.g., $12.34 = 1234 or -1234 for expenses)
- Use negative amounts for expenses/debits
- Use positive amounts for income/credits
- Parse dates as YYYY-MM-DD format
- Include ALL transactions visible in the document`;

  const parts: Part[] = [];

  if (documentType === 'csv' && typeof content === 'string') {
    parts.push({ text: `${userPrompt}\n\nCSV Content:\n\`\`\`\n${content}\n\`\`\`` });
  } else if (documentType === 'image' || documentType === 'pdf') {
    const base64Content = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content, 'utf-8').toString('base64');

    const mediaType = mimeType ?? (documentType === 'pdf' ? 'application/pdf' : 'image/jpeg');

    parts.push({
      inlineData: {
        mimeType: mediaType,
        data: base64Content,
      },
    });
    parts.push({ text: userPrompt });
  } else {
    const textContent = typeof content === 'string' ? content : content.toString('utf-8');
    parts.push({ text: `${userPrompt}\n\nDocument Content:\n\`\`\`\n${textContent}\n\`\`\`` });
  }

  const contents: Content[] = [{ role: 'user', parts }];

  const result = await model.generateContent({
    contents,
    generationConfig: {
      maxOutputTokens: 4000,
      temperature: 0.1,
    },
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini');
  }

  const parsed = JSON.parse(extractJSON(text)) as {
    transactions: Array<{
      postedAt: string;
      amount: number;
      description: string;
      merchantRaw: string;
    }>;
    receipt?: {
      merchantName: string;
      merchantAddress?: string;
      date: string;
      lineItems: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        category?: string;
      }>;
      subtotal: number;
      tax?: number;
      tip?: number;
      total: number;
      paymentMethod?: string;
    };
    metadata: { totalRows: number; parsedRows: number; errors: string[] };
  };

  const parseResult: DocumentParseResult = {
    transactions: parsed.transactions.map((tx) => ({
      postedAt: new Date(tx.postedAt),
      amount: tx.amount,
      description: tx.description,
      merchantRaw: tx.merchantRaw,
    })),
    metadata: {
      documentType,
      totalRows: parsed.metadata.totalRows,
      parsedRows: parsed.metadata.parsedRows,
      errors: parsed.metadata.errors,
    },
  };

  // Include receipt line items if present (for receipts/images)
  if (parsed.receipt) {
    parseResult.receipt = {
      merchantName: parsed.receipt.merchantName,
      merchantAddress: parsed.receipt.merchantAddress,
      date: new Date(parsed.receipt.date),
      lineItems: parsed.receipt.lineItems,
      subtotal: parsed.receipt.subtotal,
      tax: parsed.receipt.tax,
      tip: parsed.receipt.tip,
      total: parsed.receipt.total,
      paymentMethod: parsed.receipt.paymentMethod,
    };
  }

  return parseResult;
}

async function normalizeMerchantWithVertexAI(merchantRaw: string): Promise<string> {
  const model = getVertexModel();

  const prompt = `Extract the merchant/company name from this transaction description. Return ONLY the clean merchant name in uppercase, nothing else.

Transaction: "${merchantRaw}"

Examples:
- "SQ *STARBUCKS #12345 SEATTLE" -> "STARBUCKS"
- "AMZN Mktp US*AB12CD34" -> "AMAZON"
- "UBER *EATS" -> "UBER EATS"
- "TST* JOE'S PIZZA NYC" -> "JOE'S PIZZA"`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 100,
      temperature: 0,
    },
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini');
  }

  return text.trim().toUpperCase();
}

// ============================================================================
// Public API (Provider-agnostic)
// ============================================================================

/**
 * Categorize a single transaction using the configured LLM provider
 */
export async function categorizeWithLLM(
  request: LLMCategorizationRequest
): Promise<LLMCategorizationResponse> {
  try {
    const result =
      currentConfig.provider === 'vertexai'
        ? await categorizeWithVertexAI(request)
        : await categorizeWithAnthropic(request);

    // Validate confidence
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }

    return result;
  } catch (error) {
    console.error('LLM categorization error:', error);
    return {
      categoryId: null,
      categoryName: null,
      confidence: 0,
      reasoning: `Failed to categorize: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Batch categorize multiple transactions
 */
export async function batchCategorizeWithLLM(
  transactions: Array<{
    id: string;
    merchantRaw: string;
    description: string;
    amount: number;
  }>,
  categories: CategoryResponse[]
): Promise<Map<string, LLMCategorizationResponse>> {
  const results = new Map<string, LLMCategorizationResponse>();

  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  const batches: Array<typeof transactions> = [];

  for (let i = 0; i < transactions.length; i += CONCURRENCY) {
    batches.push(transactions.slice(i, i + CONCURRENCY));
  }

  for (const batch of batches) {
    const promises = batch.map(async (tx) => {
      const result = await categorizeWithLLM({
        description: tx.description,
        merchantRaw: tx.merchantRaw,
        amount: tx.amount,
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
      });
      return { id: tx.id, result };
    });

    const batchResults = await Promise.all(promises);
    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

/**
 * Parse a document (CSV, PDF, or image) using the configured LLM provider
 */
export async function parseDocumentWithLLM(
  content: string | Buffer,
  documentType: 'csv' | 'pdf' | 'image',
  mimeType?: string
): Promise<DocumentParseResult> {
  try {
    return currentConfig.provider === 'vertexai'
      ? await parseDocumentWithVertexAI(content, documentType, mimeType)
      : await parseDocumentWithAnthropic(content, documentType, mimeType);
  } catch (error) {
    console.error('Document parsing error:', error);
    return {
      transactions: [],
      metadata: {
        documentType,
        totalRows: 0,
        parsedRows: 0,
        errors: [`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`],
      },
    };
  }
}

/**
 * Normalize a merchant name using LLM for complex cases
 */
export async function normalizeMerchantWithLLM(merchantRaw: string): Promise<string> {
  // First try simple normalization
  let normalized = merchantRaw
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[#*]\d+/g, '') // Remove store numbers
    .replace(/\d{4,}/g, '') // Remove long numbers (card numbers, etc.)
    .trim();

  // If the result is too short or looks like it needs more processing, use LLM
  if (normalized.length < 3 || /^[A-Z]{1,3}\s/.test(normalized)) {
    try {
      normalized =
        currentConfig.provider === 'vertexai'
          ? await normalizeMerchantWithVertexAI(merchantRaw)
          : await normalizeMerchantWithAnthropic(merchantRaw);
    } catch (error) {
      console.warn('Failed to normalize merchant with LLM:', error);
      // Fall back to simple normalization
    }
  }

  return normalized;
}
