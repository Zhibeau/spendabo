'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatAmount, formatDate } from '@/lib/utils';
import { api } from '@/lib/api/client';

interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  parentId: string | null;
  sortOrder: number;
}

interface TransactionResponse {
  id: string;
  postedAt: string;
  amount: number;
  description: string;
  merchantRaw: string;
  merchantNormalized: string;
  categoryId: string | null;
  categoryName?: string;
  manualOverride: boolean;
  notes: string | null;
  tags: string[];
  explainability?: {
    reason: string;
    confidence: number;
    llmReasoning?: string;
    ruleName?: string;
  };
}

interface RuleSuggestion {
  merchantNormalized: string;
  categoryId: string;
  categoryName: string;
  suggestedRuleName: string;
  conditionType: string;
  conditionValue: string;
}

interface EditTransactionModalProps {
  transaction: TransactionResponse;
  onClose: () => void;
  onSaved: (updated: TransactionResponse) => void;
}

export function EditTransactionModal({ transaction, onClose, onSaved }: EditTransactionModalProps) {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId ?? '');
  const [notes, setNotes] = useState<string>(transaction.notes ?? '');
  const [tags, setTags] = useState<string[]>(transaction.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleSuggestion, setRuleSuggestion] = useState<RuleSuggestion | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Load categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get<{ categories: CategoryResponse[] }>('/api/v1/categories');
        const sorted = (res.data?.categories ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(sorted);
      } catch {
        // silently fail; user can still edit notes/tags
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setRuleSuggestion(null);
    try {
      const body: { categoryId?: string | null; notes?: string; tags?: string[] } = {};

      if (categoryId !== (transaction.categoryId ?? '')) {
        body.categoryId = categoryId === '' ? null : categoryId;
      }
      if (notes !== (transaction.notes ?? '')) {
        body.notes = notes;
      }
      const tagsChanged =
        JSON.stringify([...tags].sort()) !== JSON.stringify([...(transaction.tags ?? [])].sort());
      if (tagsChanged) {
        body.tags = tags;
      }

      const res = await api.patch<{
        transaction: TransactionResponse;
        ruleSuggestion?: RuleSuggestion | null;
      }>(`/api/v1/transactions/${transaction.id}`, body);

      if (res.data?.transaction) {
        onSaved(res.data.transaction);
        if (res.data.ruleSuggestion) {
          setRuleSuggestion(res.data.ruleSuggestion);
          return; // keep modal open briefly to show suggestion
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">
              {transaction.merchantNormalized || transaction.merchantRaw || transaction.description}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
              <span>{formatDate(transaction.postedAt)}</span>
              <span>·</span>
              <span className={cn(
                'font-medium',
                transaction.amount >= 0 ? 'text-income' : 'text-expense'
              )}>
                {formatAmount(transaction.amount)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            {loadingCategories ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">— Uncategorized —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            )}
            {transaction.manualOverride && (
              <p className="text-xs text-muted-foreground">
                Previously manually set to{' '}
                <span className="font-medium">{transaction.categoryName ?? 'this category'}</span>.
              </p>
            )}
            {!transaction.manualOverride && transaction.explainability && (
              <p className="text-xs text-muted-foreground">
                Auto-categorized
                {transaction.explainability.reason === 'rule_match' && transaction.explainability.ruleName
                  ? ` by rule "${transaction.explainability.ruleName}"`
                  : transaction.explainability.reason === 'llm'
                  ? ' by AI'
                  : ''}
                {' '}(confidence: {Math.round((transaction.explainability.confidence ?? 0) * 100)}%).
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a personal note…"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-md border border-input bg-background min-h-10">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs rounded px-2 py-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(); }}
                placeholder={tags.length === 0 ? 'Add tags (press Enter)…' : ''}
                className="flex-1 min-w-24 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Rule suggestion */}
          {ruleSuggestion && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">Rule suggestion</p>
                  <p className="text-yellow-700 dark:text-yellow-400 mt-0.5">
                    Always categorize{' '}
                    <span className="font-medium">{ruleSuggestion.merchantNormalized}</span>{' '}
                    as{' '}
                    <span className="font-medium">{selectedCategoryName ?? ruleSuggestion.categoryName}</span>?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pl-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-800 dark:text-yellow-300 border-yellow-400"
                  onClick={onClose}
                >
                  Create rule
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} loading={saving} disabled={saving}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
