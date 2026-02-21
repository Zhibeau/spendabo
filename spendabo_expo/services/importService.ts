import { IMPORTS } from "./mockData";
import type { Import } from "../types";

// TODO: Replace with real API calls to Cloud Run backend

export async function getImports(): Promise<Import[]> {
  // TODO: GET /api/imports
  return [...IMPORTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function uploadImport(fileName: string): Promise<Import> {
  // TODO: POST /api/imports (multipart upload to GCS)
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
