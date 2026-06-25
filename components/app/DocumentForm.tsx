'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DOCUMENT_CATEGORIES,
  getDocumentCategoryLabel,
  type DocumentCategory,
} from '@/lib/document-categories';

export type DocumentFormValues = {
  title: string;
  description: string;
  category: DocumentCategory;
  tags: string;
  expiresAt: string;
  externalUrl: string;
  file: File | null;
  note: string;
};

type DocumentFormProps = {
  mode: 'create' | 'edit';
  entryType: 'File' | 'Link';
  initialValues?: Partial<DocumentFormValues>;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
  showFileInput?: boolean;
  showVersionNote?: boolean;
};

const defaultValues: DocumentFormValues = {
  title: '',
  description: '',
  category: 'HR',
  tags: '',
  expiresAt: '',
  externalUrl: '',
  file: null,
  note: '',
};

export function DocumentForm({
  mode,
  entryType,
  initialValues,
  onSubmit,
  onCancel,
  disabled = false,
  showFileInput = false,
  showVersionNote = false,
}: DocumentFormProps) {
  const [form, setForm] = useState<DocumentFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="document-title">제목</Label>
        <Input
          id="document-title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          disabled={disabled || submitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-description">설명</Label>
        <Input
          id="document-description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          disabled={disabled || submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-category">카테고리</Label>
        <select
          id="document-category"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.category}
          onChange={(event) =>
            setForm({ ...form, category: event.target.value as DocumentCategory })
          }
          disabled={disabled || submitting || mode === 'edit'}
        >
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {getDocumentCategoryLabel(category)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-tags">태그 (쉼표로 구분)</Label>
        <Input
          id="document-tags"
          value={form.tags}
          onChange={(event) => setForm({ ...form, tags: event.target.value })}
          disabled={disabled || submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-expires">만료일 (선택)</Label>
        <Input
          id="document-expires"
          type="date"
          value={form.expiresAt}
          onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
          disabled={disabled || submitting}
        />
      </div>

      {entryType === 'Link' && (
        <div className="space-y-2">
          <Label htmlFor="document-url">링크 URL</Label>
          <Input
            id="document-url"
            type="url"
            value={form.externalUrl}
            onChange={(event) => setForm({ ...form, externalUrl: event.target.value })}
            disabled={disabled || submitting}
            required
          />
        </div>
      )}

      {showFileInput && (
        <div className="space-y-2">
          <Label htmlFor="document-file">파일</Label>
          <Input
            id="document-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
            onChange={(event) =>
              setForm({ ...form, file: event.target.files?.[0] ?? null })
            }
            disabled={disabled || submitting}
            required={mode === 'create'}
          />
        </div>
      )}

      {showVersionNote && (
        <div className="space-y-2">
          <Label htmlFor="document-note">개정 메모 (선택)</Label>
          <Input
            id="document-note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            disabled={disabled || submitting}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={disabled || submitting}>
          {submitting ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
