import { IMPORTS } from "./mockData";
import type { Import } from "../types";

// TODO: Replace with real API calls to Cloud Run backend
// Base URL for the Cloud Run backend (configure via environment or constants)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.spendabo.example.com";

// Default account ID — replace with a real account selector when auth is wired up
const DEFAULT_ACCOUNT_ID = "acc1";

export async function getImports(): Promise<Import[]> {
  // TODO: GET /api/v1/imports
  return [...IMPORTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function uploadImport(fileName: string): Promise<Import> {
  // TODO: POST /api/v1/imports/upload (multipart upload to GCS)
  return {
    id: `imp_${Date.now()}`,
    fileName,
    status: "processing",
    totalRows: 0,
    importedCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Upload a receipt image (base64) to the backend import API.
 *
 * Calls POST /api/v1/imports/upload with a JSON body containing:
 *   - accountId: the account to import transactions into
 *   - content:   base64-encoded image
 *   - filename:  original filename
 *   - mimeType:  MIME type of the image
 */
export async function uploadReceiptImage(
  base64Content: string,
  mimeType: string,
  filename: string,
  accountId: string = DEFAULT_ACCOUNT_ID
): Promise<Import> {
  const response = await fetch(`${API_BASE_URL}/api/v1/imports/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: add Authorization header with Firebase JWT token
      // "Authorization": `Bearer ${await getIdToken()}`,
    },
    body: JSON.stringify({
      accountId,
      content: base64Content,
      filename,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as {
      error?: { message?: string };
    };
    throw new Error(
      errorBody?.error?.message ?? `Upload failed with status ${response.status}`
    );
  }

  const body = await response.json() as {
    success: boolean;
    data?: { importId: string; created: number; skipped: number; errors: string[] };
    error?: { message?: string };
  };

  if (!body.success || !body.data) {
    throw new Error(body.error?.message ?? "Import processing failed");
  }

  const { importId, created, skipped, errors } = body.data;

  return {
    id: importId,
    fileName: filename,
    status: errors.length > 0 && created === 0 ? "failed" : "completed",
    totalRows: created + skipped,
    importedCount: created,
    errorCount: errors.length,
    createdAt: new Date().toISOString(),
  };
}
