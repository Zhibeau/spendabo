# Backend Automated Testing

This document provides information about the automated test suite for the Spendabo backend API.

## Overview

The backend uses Jest and Supertest for automated API testing with comprehensive coverage of:
- Request/response handling
- Input validation  
- Error handling
- Authentication
- Service integration

## Running Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Results

Current status: **40/40 tests passing** ✅

```
Test Suites: 2 passed, 2 total
Tests:       40 passed, 40 total
Snapshots:   0 total
```

## Test Files

- `src/routes/transactions.test.ts` - Transaction & Category route tests (27 tests)
- `src/routes/imports.test.ts` - Import route tests (13 tests)

## Configuration

- **Jest Config**: `jest.config.js`
- **TypeScript**: Uses ts-jest with CommonJS module format for tests
- **Mocking**: Jest mocks for Firestore, services, and authentication

## Writing New Tests

See individual test files for examples. Key patterns:
1. Mock external dependencies before importing
2. Use `beforeEach` to setup, `afterEach` to cleanup
3. Test both success and error paths
4. Validate request/response schemas

For more details, see the test files directly.

---

## Manual Testing: Multimodal Import (PDF & Images)

In addition to automated unit tests, you can manually test PDF and image imports with real files using the multimodal LLM processing pipeline.

### Prerequisites

1. **Environment Setup**: Ensure your GCP credentials are configured
2. **API Keys**: Set up Anthropic API key or Vertex AI credentials
   - For Anthropic: Set `ANTHROPIC_API_KEY` environment variable
   - For Vertex AI: Ensure Application Default Credentials are configured

3. **Test Files**: Place your test files in `test-data/` directory

### Running the Test

```bash
cd backend

# Test with a receipt image
tsx src/scripts/test-multimodal-import.ts test-data/receipt.jpg

# Test with a bank statement PDF
tsx src/scripts/test-multimodal-import.ts test-data/bank-statement.pdf

# Test with a CSV file
tsx src/scripts/test-multimodal-import.ts test-data/transactions.csv
```

### What the Test Does

1. ✅ Detects file type automatically (CSV, PDF, or Image)
2. ✅ Creates a temporary test account in Firestore
3. ✅ Processes the file with multimodal LLM
4. ✅ Extracts and displays transactions found
5. ✅ Shows categorization results with confidence scores
6. ✅ Cleans up all test data automatically

### Sample Output

```
🧪 Multimodal Import Test

============================================================
📄 File: receipt.jpg
📋 Type: image
🏷️  MIME: image/jpeg
============================================================

⚙️  Loading configuration...
✅ Project: your-project-id
✅ Region: northamerica-northeast1

🔥 Initializing Firestore...
✅ Firestore connected

👤 Test User ID: test-user-1234567890
🏦 Test Account ID: test-account-1234567890

📝 Creating test account...
✅ Test account created

📖 Reading file...
✅ File read: 245.67 KB

💾 Creating import record...
✅ Import created: import-xyz123

🤖 Processing with multimodal LLM...
⏳ This may take 10-30 seconds depending on file size...

============================================================
📊 RESULTS
============================================================

⏱️  Processing time: 12.34s
✨ Success: ✅
📥 Transactions created: 3
⏭️  Transactions skipped: 0

============================================================
💰 EXTRACTED TRANSACTIONS
============================================================

Transaction 1:
  📅 Date: 2024-01-15
  💵 Amount: -$45.67
  🏪 Merchant: STARBUCKS
  📝 Description: Coffee and pastry
  🏷️  Category: dining
  🧠 Categorization:
     Method: llm
     Confidence: 95%
     Reasoning: Coffee purchase at Starbucks, typical dining expense

...
```

### Supported File Types

- **Images**: JPG, PNG, WebP, HEIC (receipt photos, transaction screenshots)
- **PDFs**: Bank statements, credit card statements
- **CSV**: Traditional CSV exports (for comparison)

### Tips for Best Results

1. **Image Quality**: Use clear, well-lit photos with readable text
2. **PDF Format**: Text-based PDFs work better than scanned images
3. **File Size**: Keep images under 5MB for faster processing
4. **Multiple Transactions**: PDFs and receipts with multiple items are supported

### Troubleshooting

**Error: "ANTHROPIC_API_KEY not found"**
- Set your API key: `export ANTHROPIC_API_KEY="your-key-here"`

**Error: "File not found"**
- Ensure the file path is correct relative to the backend directory
- Place test files in `test-data/` directory

**Error: "Unsupported file type"**
- Check that your file has a supported extension (.jpg, .pdf, .csv, etc.)

**Slow Processing**
- Large files (>2MB) may take 20-30 seconds to process
- This is normal for multimodal LLM analysis
