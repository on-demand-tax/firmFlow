'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DataRecordActions,
  DataRecordCard,
  DataRecordRow,
} from '@/components/app/DataRecordCard';
import { DocumentForm, type DocumentFormValues } from '@/components/app/DocumentForm';
import { DocumentVersionHistory } from '@/components/app/DocumentVersionHistory';
import { ResponsiveDataView } from '@/components/app/ResponsiveDataView';
import { SimpleModal } from '@/components/app/SimpleModal';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DOCUMENT_CATEGORIES,
  getDocumentCategoryLabel,
  type DocumentCategory,
} from '@/lib/document-categories';
import { canDeleteDocument, canEditDocument, type UserRole } from '@/lib/permissions';
import { tableWrapCell } from '@/lib/table-cell-styles';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type DocumentItem = {
  _id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  categoryLabel: string;
  tags: string[];
  entryType: 'File' | 'Link';
  externalUrl?: string;
  currentVersion?: number;
  currentFileUrl?: string;
  createdBy: string;
  expiry: {
    status: string;
    label: string | null;
  };
  versions: Array<{
    version: number;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
    note?: string;
  }>;
};

type ModalMode =
  | { type: 'create-link' }
  | { type: 'create-file' }
  | { type: 'edit'; doc: DocumentItem }
  | { type: 'new-version'; doc: DocumentItem }
  | { type: 'detail'; doc: DocumentItem }
  | null;

type DocumentsPageClientProps = {
  role: UserRole;
  userId: string;
};

export function DocumentsPageClient({ role, userId }: DocumentsPageClientProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (category !== 'ALL') params.set('category', category);
    if (search.trim()) params.set('q', search.trim());
    if (expiringOnly) params.set('expiring', '1');
    params.set('includeExpired', '1');

    const res = await fetch(`/api/documents?${params.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? '문서를 불러오지 못했습니다');
      setDocuments([]);
    } else {
      setDocuments(await res.json());
    }

    setLoading(false);
  }, [category, search, expiringOnly]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const todayItems = useMemo(
    () => documents.filter((doc) => doc.expiry.status === 'today'),
    [documents],
  );

  const otherItems = useMemo(
    () => documents.filter((doc) => doc.expiry.status !== 'today'),
    [documents],
  );

  async function createLink(values: DocumentFormValues) {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        category: values.category,
        tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        externalUrl: values.externalUrl,
        expiresAt: values.expiresAt || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '등록에 실패했습니다');
    }
    setModal(null);
    await loadDocuments();
  }

  async function createFile(values: DocumentFormValues) {
    if (!values.file) throw new Error('파일을 선택해 주세요');

    const form = new FormData();
    form.append('file', values.file);
    form.append('title', values.title);
    form.append('category', values.category);
    if (values.description) form.append('description', values.description);
    if (values.tags) form.append('tags', values.tags);
    if (values.expiresAt) form.append('expiresAt', values.expiresAt);

    const res = await fetch('/api/documents/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '업로드에 실패했습니다');
    }
    setModal(null);
    await loadDocuments();
  }

  async function editDocument(doc: DocumentItem, values: DocumentFormValues) {
    const res = await fetch(`/api/documents/${doc._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        externalUrl: doc.entryType === 'Link' ? values.externalUrl : undefined,
        expiresAt: values.expiresAt || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '수정에 실패했습니다');
    }
    setModal(null);
    await loadDocuments();
  }

  async function uploadNewVersion(doc: DocumentItem, values: DocumentFormValues) {
    if (!values.file) throw new Error('파일을 선택해 주세요');

    const form = new FormData();
    form.append('file', values.file);
    form.append('title', values.title);
    form.append('category', doc.category);
    form.append('documentId', doc._id);
    if (values.note) form.append('note', values.note);

    const res = await fetch('/api/documents/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '업로드에 실패했습니다');
    }
    setModal(null);
    await loadDocuments();
  }

  async function revertVersion(doc: DocumentItem, version: number) {
    const res = await fetch(`/api/documents/${doc._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentVersion: version }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '현행 지정에 실패했습니다');
    }
    const updated: DocumentItem = await res.json();
    setModal((current) =>
      current?.type === 'detail' ? { type: 'detail', doc: updated } : current,
    );
    await loadDocuments();
  }

  async function deleteDocument(doc: DocumentItem) {
    const res = await fetch(`/api/documents/${doc._id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? '삭제에 실패했습니다');
    }
    setModal(null);
    await loadDocuments();
  }

  function renderExpiryBadge(doc: DocumentItem) {
    if (!doc.expiry.label) return null;
    const variant =
      doc.expiry.status === 'today'
        ? 'destructive'
        : doc.expiry.status === 'expired'
          ? 'secondary'
          : 'outline';
    return <Badge variant={variant}>{doc.expiry.label}</Badge>;
  }

  function renderDocumentRow(doc: DocumentItem) {
    const editable = canEditDocument({ userId, role }, { createdBy: doc.createdBy });
    const deletable = canDeleteDocument({ userId, role });

    return (
      <DataRecordCard
        key={doc._id}
        className={doc.expiry.status === 'expired' ? 'opacity-60' : undefined}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words font-medium">{doc.title}</p>
            <Badge variant="secondary">{doc.categoryLabel}</Badge>
            {doc.entryType === 'File' && doc.currentVersion ? (
              <Badge variant="outline">v{doc.currentVersion}</Badge>
            ) : null}
            {renderExpiryBadge(doc)}
          </div>
          {doc.description ? (
            <p className="break-words text-sm text-muted-foreground">{doc.description}</p>
          ) : null}
          {doc.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {doc.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <DataRecordActions>
          {doc.entryType === 'Link' && doc.externalUrl ? (
            <a
              href={doc.externalUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              링크 열기
            </a>
          ) : null}
          {doc.entryType === 'File' && doc.currentFileUrl ? (
            <a
              href={doc.currentFileUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Drive에서 보기
            </a>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setModal({ type: 'detail', doc })}>
            상세
          </Button>
          {editable ? (
            <Button variant="outline" size="sm" onClick={() => setModal({ type: 'edit', doc })}>
              수정
            </Button>
          ) : null}
          {editable && doc.entryType === 'File' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal({ type: 'new-version', doc })}
            >
              새 버전
            </Button>
          ) : null}
          {deletable ? (
            <Button variant="destructive" size="sm" onClick={() => void deleteDocument(doc)}>
              삭제
            </Button>
          ) : null}
        </DataRecordActions>
      </DataRecordCard>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:p-6">
      <aside className="md:w-48 md:shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">카테고리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant={category === 'ALL' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCategory('ALL')}
            >
              전체
            </Button>
            {DOCUMENT_CATEGORIES.map((item) => (
              <Button
                key={item}
                variant={category === item ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setCategory(item)}
              >
                {getDocumentCategoryLabel(item)}
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">문서</h1>
            <p className="text-sm text-muted-foreground">
              운영 서류·참고 자료·링크를 카테고리별로 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setModal({ type: 'create-link' })}>링크 등록</Button>
            <Button variant="outline" onClick={() => setModal({ type: 'create-file' })}>
              파일 등록
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="제목 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant={expiringOnly ? 'default' : 'outline'}
            onClick={() => setExpiringOnly((value) => !value)}
          >
            만료 임박만
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}

        {!loading && todayItems.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-destructive">오늘 만료</h2>
            <div className="space-y-3">{todayItems.map(renderDocumentRow)}</div>
          </section>
        ) : null}

        {!loading && otherItems.length === 0 && todayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 문서가 없습니다.</p>
        ) : (
          <ResponsiveDataView
            mobile={<div className="space-y-3">{otherItems.map(renderDocumentRow)}</div>}
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>만료</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherItems.map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell className={tableWrapCell}>{doc.title}</TableCell>
                      <TableCell>{doc.categoryLabel}</TableCell>
                      <TableCell>{doc.entryType === 'File' ? '파일' : '링크'}</TableCell>
                      <TableCell>{doc.expiry.label ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModal({ type: 'detail', doc })}
                        >
                          상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
        )}
      </div>

      {modal?.type === 'create-link' ? (
        <SimpleModal
          open
          title="링크 등록"
          onClose={() => setModal(null)}
          footer={<></>}
        >
          <DocumentForm
            mode="create"
            entryType="Link"
            onSubmit={createLink}
            onCancel={() => setModal(null)}
          />
        </SimpleModal>
      ) : null}

      {modal?.type === 'create-file' ? (
        <SimpleModal open title="파일 등록" onClose={() => setModal(null)} footer={<></>}>
          <DocumentForm
            mode="create"
            entryType="File"
            showFileInput
            onSubmit={createFile}
            onCancel={() => setModal(null)}
          />
        </SimpleModal>
      ) : null}

      {modal?.type === 'edit' ? (
        <SimpleModal open title="문서 수정" onClose={() => setModal(null)} footer={<></>}>
          <DocumentForm
            mode="edit"
            entryType={modal.doc.entryType}
            initialValues={{
              title: modal.doc.title,
              description: modal.doc.description ?? '',
              category: modal.doc.category,
              tags: modal.doc.tags.join(', '),
              externalUrl: modal.doc.externalUrl ?? '',
            }}
            onSubmit={(values) => editDocument(modal.doc, values)}
            onCancel={() => setModal(null)}
          />
        </SimpleModal>
      ) : null}

      {modal?.type === 'new-version' ? (
        <SimpleModal open title="새 버전 업로드" onClose={() => setModal(null)} footer={<></>}>
          <DocumentForm
            mode="create"
            entryType="File"
            showFileInput
            showVersionNote
            initialValues={{ title: modal.doc.title, category: modal.doc.category }}
            onSubmit={(values) => uploadNewVersion(modal.doc, values)}
            onCancel={() => setModal(null)}
          />
        </SimpleModal>
      ) : null}

      {modal?.type === 'detail' ? (
        <SimpleModal open title={modal.doc.title} onClose={() => setModal(null)} footer={<></>}>
          <div className="space-y-4">
            <DataRecordCard>
              <DataRecordRow label="카테고리">{modal.doc.categoryLabel}</DataRecordRow>
              <DataRecordRow label="유형">
                {modal.doc.entryType === 'File' ? '파일' : '링크'}
              </DataRecordRow>
              {modal.doc.expiry.label ? (
                <DataRecordRow label="만료">{modal.doc.expiry.label}</DataRecordRow>
              ) : null}
            </DataRecordCard>
            {modal.doc.entryType === 'File' ? (
              <DocumentVersionHistory
                versions={modal.doc.versions}
                currentVersion={modal.doc.currentVersion}
                canEdit={canEditDocument({ userId, role }, { createdBy: modal.doc.createdBy })}
                onRevert={(version) => revertVersion(modal.doc, version)}
              />
            ) : null}
          </div>
        </SimpleModal>
      ) : null}
    </div>
  );
}
