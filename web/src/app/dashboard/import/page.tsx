'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_TYPES: Record<string, string> = {
  'text/csv': 'CSV',
  'application/csv': 'CSV',
  'text/plain': 'CSV',
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
};

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',');

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  lastFour: string | null;
}

interface UploadResult {
  importId: string;
  created: number;
  skipped: number;
  errors: string[];
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to encode file'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('checking');
  const [newAccountInstitution, setNewAccountInstitution] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await api.get<{ accounts: Account[] }>('/api/v1/accounts');
        if (response.data?.accounts) {
          setAccounts(response.data.accounts);
          // Auto-select if there's only one
          if (response.data.accounts.length === 1) {
            setAccountId(response.data.accounts[0].id);
          }
        }
      } catch {
        // User might not have accounts yet, that's fine
      } finally {
        setAccountsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  const handleCreateAccount = useCallback(async () => {
    if (!newAccountName.trim()) return;

    setCreatingAccount(true);
    try {
      const response = await api.post<Account>('/api/v1/accounts', {
        name: newAccountName.trim(),
        type: newAccountType,
        institution: newAccountInstitution.trim() || undefined,
      });

      if (response.data) {
        const created = response.data;
        setAccounts((prev) => [created, ...prev]);
        setAccountId(created.id);
        setShowNewAccount(false);
        setNewAccountName('');
        setNewAccountType('checking');
        setNewAccountInstitution('');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create account'
      );
    } finally {
      setCreatingAccount(false);
    }
  }, [newAccountName, newAccountType, newAccountInstitution]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${formatFileSize(file.size)}). Maximum size is 10MB.`;
    }
    if (!ACCEPTED_TYPES[file.type]) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, boolean> = {
        csv: true, pdf: true, jpg: true, jpeg: true,
        png: true, webp: true, heic: true, heif: true,
      };
      if (!ext || !extMap[ext]) {
        return `Unsupported file type. Supported: CSV, PDF, JPEG, PNG, WebP, HEIC.`;
      }
    }
    return null;
  }, []);

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  }, [handleFile]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    setStatus('idle');
    setResult(null);
    setErrorMessage(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !accountId) return;

    setStatus('uploading');
    setErrorMessage(null);
    setResult(null);

    try {
      const base64Content = await fileToBase64(selectedFile);

      let mimeType = selectedFile.type;
      if (!ACCEPTED_TYPES[mimeType]) {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        const extToMime: Record<string, string> = {
          csv: 'text/csv',
          pdf: 'application/pdf',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
          heic: 'image/heic',
          heif: 'image/heif',
        };
        mimeType = (ext && extToMime[ext]) || 'application/octet-stream';
      }

      const response = await api.post<UploadResult>('/api/v1/imports/upload', {
        accountId,
        content: base64Content,
        filename: selectedFile.name,
        mimeType,
      });

      if (response.data) {
        setResult(response.data);
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      );
    }
  }, [selectedFile, accountId]);

  const getFileTypeLabel = (file: File): string => {
    if (ACCEPTED_TYPES[file.type]) return ACCEPTED_TYPES[file.type];
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext || 'Unknown';
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

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
        <CardContent className="space-y-4">
          {/* Account selector */}
          <div>
            <label htmlFor="account" className="block text-sm font-medium mb-1.5">
              Account
            </label>
            {accountsLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-muted animate-pulse" />
            ) : !showNewAccount ? (
              <div className="space-y-2">
                {accounts.length > 0 ? (
                  <div className="relative">
                    <select
                      id="account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      disabled={status === 'uploading'}
                      className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="">Select an account...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                          {account.institution ? ` (${account.institution})` : ''}
                          {account.lastFour ? ` ••${account.lastFour}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No accounts yet. Create one to get started.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewAccount(true)}
                  disabled={status === 'uploading'}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add new account
                </button>
              </div>
            ) : (
              /* New account form */
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <label htmlFor="newAccountName" className="block text-xs font-medium mb-1">
                    Account Name *
                  </label>
                  <input
                    id="newAccountName"
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder='e.g. "Chase Checking"'
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="newAccountType" className="block text-xs font-medium mb-1">
                      Type *
                    </label>
                    <div className="relative">
                      <select
                        id="newAccountType"
                        value={newAccountType}
                        onChange={(e) => setNewAccountType(e.target.value)}
                        className="flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="newAccountInstitution" className="block text-xs font-medium mb-1">
                      Institution
                    </label>
                    <input
                      id="newAccountInstitution"
                      type="text"
                      value={newAccountInstitution}
                      onChange={(e) => setNewAccountInstitution(e.target.value)}
                      placeholder="e.g. Chase"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateAccount}
                    disabled={!newAccountName.trim() || creatingAccount}
                    loading={creatingAccount}
                  >
                    Create Account
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewAccount(false)}
                    disabled={creatingAccount}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Drop zone */}
          {!selectedFile ? (
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload className={cn(
                'h-12 w-12 mx-auto mb-4 transition-colors',
                dragOver ? 'text-primary' : 'text-muted-foreground'
              )} />
              <p className={cn(
                'font-medium',
                dragOver ? 'text-primary' : 'text-muted-foreground'
              )}>
                {dragOver ? 'Drop your file here' : 'Drag and drop your file here, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                CSV, PDF, JPEG, PNG, WebP, HEIC — Max 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleFileInput}
                className="hidden"
                aria-label="Upload file"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getFileTypeLabel(selectedFile)} — {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {status !== 'uploading' && (
                <button
                  onClick={handleRemoveFile}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* File validation error */}
          {fileError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{fileError}</p>
            </div>
          )}

          {/* Upload button */}
          {selectedFile && status !== 'success' && (
            <Button
              onClick={handleUpload}
              disabled={!accountId || status === 'uploading'}
              loading={status === 'uploading'}
              className="w-full"
            >
              {status === 'uploading'
                ? 'Uploading...'
                : !accountId
                  ? 'Select an account first'
                  : `Upload to ${selectedAccount?.name ?? 'account'}`}
            </Button>
          )}

          {/* Success message */}
          {status === 'success' && result && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium">Import successful</p>
              </div>
              <div className="text-sm text-green-700 dark:text-green-400 pl-7 space-y-1">
                <p>{result.created} transaction{result.created !== 1 ? 's' : ''} created</p>
                {result.skipped > 0 && (
                  <p>{result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped</p>
                )}
                {result.errors.length > 0 && (
                  <p className="text-yellow-700 dark:text-yellow-400">
                    {result.errors.length} warning{result.errors.length !== 1 ? 's' : ''}: {result.errors[0]}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-7 mt-2"
                onClick={handleRemoveFile}
              >
                Import another file
              </Button>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && errorMessage && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium text-sm">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setStatus('idle');
                  setErrorMessage(null);
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
