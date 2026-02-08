/**
 * Manual Test Script for Multimodal Import (PDF and Images)
 *
 * This script allows you to test PDF and image imports with real files
 * using the multimodal LLM processing pipeline.
 *
 * Usage:
 *   tsx src/scripts/test-multimodal-import.ts <file-path>
 *
 * Example:
 *   tsx src/scripts/test-multimodal-import.ts ./test-data/receipt.jpg
 *   tsx src/scripts/test-multimodal-import.ts ./test-data/statement.pdf
 */

import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';
import { getFirestore, Collections } from '../services/firestore.js';
import { createImport, processImport } from '../services/import-service.js';
import { loadConfig } from '../config.js';

// File type detection based on extension
function detectFileType(filename: string): 'csv' | 'pdf' | 'image' | null {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'csv' || ext === 'txt') return 'csv';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext || '')) return 'image';

  return null;
}

// MIME type detection
function detectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    'csv': 'text/csv',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

async function testMultimodalImport(filePath: string) {
  console.log('🧪 Multimodal Import Test\n');
  console.log('='.repeat(60));

  // Check if file exists
  if (!existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Detect file type
  const filename = basename(filePath);
  const fileType = detectFileType(filename);
  const mimeType = detectMimeType(filename);

  if (!fileType) {
    console.error(`❌ Error: Unsupported file type for: ${filename}`);
    console.error('Supported: CSV, PDF, JPG, PNG, WebP, HEIC');
    process.exit(1);
  }

  console.log(`📄 File: ${filename}`);
  console.log(`📋 Type: ${fileType}`);
  console.log(`🏷️  MIME: ${mimeType}`);
  console.log('='.repeat(60));
  console.log();

  try {
    // Load configuration
    console.log('⚙️  Loading configuration...');
    const config = loadConfig();
    console.log(`✅ Project: ${config.projectId}`);
    console.log(`✅ Region: ${config.region}`);
    console.log();

    // Initialize Firestore
    console.log('🔥 Initializing Firestore...');
    const db = getFirestore(config);
    console.log('✅ Firestore connected');
    console.log();

    // Test user ID (you can change this)
    const testUserId = 'test-user-' + Date.now();
    const testAccountId = 'test-account-' + Date.now();

    console.log(`👤 Test User ID: ${testUserId}`);
    console.log(`🏦 Test Account ID: ${testAccountId}`);
    console.log();

    // Create test account
    console.log('📝 Creating test account...');
    await db.collection(Collections.ACCOUNTS).doc(testAccountId).set({
      uid: testUserId,
      name: 'Test Account',
      type: 'checking',
      institution: 'Test Bank',
      lastFour: '1234',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Test account created');
    console.log();

    // Read file content
    console.log('📖 Reading file...');
    const fileBuffer = readFileSync(filePath);
    const fileSizeKB = (fileBuffer.length / 1024).toFixed(2);
    console.log(`✅ File read: ${fileSizeKB} KB`);
    console.log();

    // Create import record
    console.log('💾 Creating import record...');
    const importId = await createImport(
      db,
      testUserId,
      testAccountId,
      filename,
      fileType,
      ''  // No storage path for this test
    );
    console.log(`✅ Import created: ${importId}`);
    console.log();

    // Process the import with multimodal LLM
    console.log('🤖 Processing with multimodal LLM...');
    console.log('⏳ This may take 10-30 seconds depending on file size...');
    console.log();

    const startTime = Date.now();

    // For CSV files, pass as string; for images/PDFs, pass as Buffer
    // The LLM service will handle base64 encoding internally
    const fileContent = fileType === 'csv'
      ? fileBuffer.toString('utf-8')  // CSV needs text content
      : fileBuffer;                    // Images/PDFs need raw Buffer

    const result = await processImport(
      db,
      testUserId,
      testAccountId,
      importId,
      fileContent,
      fileType,
      mimeType
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log();

    console.log(`⏱️  Processing time: ${duration}s`);
    console.log(`✨ Success: ${result.success ? '✅' : '❌'}`);
    console.log(`📥 Transactions created: ${result.created}`);
    console.log(`⏭️  Transactions skipped: ${result.skipped}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log();

    // Fetch and display created transactions
    if (result.created > 0) {
      console.log('='.repeat(60));
      console.log('💰 EXTRACTED TRANSACTIONS');
      console.log('='.repeat(60));
      console.log();

      const transactionsSnapshot = await db
        .collection(Collections.TRANSACTIONS)
        .where('uid', '==', testUserId)
        .where('importId', '==', importId)
        .orderBy('postedAt', 'desc')
        .get();

      transactionsSnapshot.docs.forEach((doc, index) => {
        const tx = doc.data();
        const amount = (tx.amount / 100).toFixed(2);
        const sign = tx.amount < 0 ? '-' : '+';
        const postedDate = tx.postedAt.toDate().toISOString().split('T')[0];

        console.log(`Transaction ${index + 1}:`);
        console.log(`  📅 Date: ${postedDate}`);
        console.log(`  💵 Amount: ${sign}$${Math.abs(parseFloat(amount))}`);
        console.log(`  🏪 Merchant: ${tx.merchantNormalized}`);
        console.log(`  📝 Description: ${tx.description}`);

        if (tx.categoryId) {
          console.log(`  🏷️  Category: ${tx.categoryId}`);
        }

        if (tx.explainability) {
          console.log(`  🧠 Categorization:`);
          console.log(`     Method: ${tx.explainability.reason}`);
          console.log(`     Confidence: ${(tx.explainability.confidence * 100).toFixed(0)}%`);
          if (tx.explainability.llmReasoning) {
            console.log(`     Reasoning: ${tx.explainability.llmReasoning}`);
          }
        }

        console.log();
      });
    }

    // Cleanup
    console.log('='.repeat(60));
    console.log('🧹 Cleanup');
    console.log('='.repeat(60));
    console.log();

    console.log('🗑️  Deleting test account...');
    await db.collection(Collections.ACCOUNTS).doc(testAccountId).delete();

    console.log('🗑️  Deleting import record...');
    await db.collection(Collections.IMPORTS).doc(importId).delete();

    if (result.created > 0) {
      console.log('🗑️  Deleting test transactions...');
      const batch = db.batch();
      const txSnapshot = await db
        .collection(Collections.TRANSACTIONS)
        .where('importId', '==', importId)
        .get();

      txSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Deleted ${txSnapshot.size} transactions`);
    }

    console.log();
    console.log('✅ Cleanup complete');
    console.log();
    console.log('='.repeat(60));
    console.log('🎉 Test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ ERROR');
    console.error('='.repeat(60));
    console.error();

    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: tsx src/scripts/test-multimodal-import.ts <file-path>');
  console.error();
  console.error('Examples:');
  console.error('  tsx src/scripts/test-multimodal-import.ts ./test-data/receipt.jpg');
  console.error('  tsx src/scripts/test-multimodal-import.ts ./test-data/statement.pdf');
  console.error('  tsx src/scripts/test-multimodal-import.ts ./test-data/transactions.csv');
  process.exit(1);
}

testMultimodalImport(filePath);
