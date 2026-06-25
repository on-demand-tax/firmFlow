import { getDayRangeSeoul, parseDateOnlySeoul } from '@/lib/dates';
import { getDocumentExpiryInfo } from '@/lib/document-expiry';
import { getDocumentCategoryLabel, isDocumentCategory } from '@/lib/document-categories';
import type { IInternalDocument } from '@/models/InternalDocument';

export function serializeDocument(doc: IInternalDocument) {
  const currentVersionData =
    doc.entryType === 'File' && doc.currentVersion
      ? doc.versions.find((version) => version.version === doc.currentVersion)
      : undefined;

  return {
    _id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    categoryLabel: getDocumentCategoryLabel(doc.category),
    tags: doc.tags,
    entryType: doc.entryType,
    externalUrl: doc.externalUrl,
    expiresAt: doc.expiresAt?.toISOString(),
    createdBy: doc.createdBy.toString(),
    currentVersion: doc.currentVersion,
    versions:
      doc.entryType === 'File'
        ? doc.versions.map((version) => ({
            version: version.version,
            googleDriveFileId: version.googleDriveFileId,
            fileUrl: version.fileUrl,
            fileName: version.fileName,
            mimeType: version.mimeType,
            uploadedBy: version.uploadedBy.toString(),
            uploadedAt: version.uploadedAt.toISOString(),
            note: version.note,
          }))
        : [],
    currentFileUrl: currentVersionData?.fileUrl,
    expiry: getDocumentExpiryInfo(doc.expiresAt),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function parseDocumentExpiresAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  return parseDateOnlySeoul(value);
}

export function buildDocumentListFilter(params: {
  category?: string | null;
  tag?: string | null;
  q?: string | null;
  includeExpired?: boolean;
  now?: Date;
}): { filter: Record<string, unknown> } | { error: string } {
  const filter: Record<string, unknown> = {};
  const now = params.now ?? new Date();

  if (params.category) {
    if (!isDocumentCategory(params.category)) {
      return { error: '카테고리가 올바르지 않습니다' };
    }
    filter.category = params.category;
  }

  if (params.tag) {
    filter.tags = params.tag.trim().toLowerCase();
  }

  if (params.q) {
    filter.title = { $regex: params.q.trim(), $options: 'i' };
  }

  if (!params.includeExpired) {
    const { start: todayStart } = getDayRangeSeoul(now);
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: todayStart } },
    ];
  }

  return { filter };
}
