import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isDocumentCategory } from '@/lib/document-categories';
import {
  buildDocumentListFilter,
  parseDocumentExpiresAt,
  serializeDocument,
} from '@/lib/documents';
import { isExpiringWithinDays, sortByExpiryUrgency } from '@/lib/document-expiry';
import {
  InternalDocumentModel,
  normalizeDocumentTags,
} from '@/models/InternalDocument';
import { isReadOnlyOnLeave } from '@/lib/permissions';

export async function GET(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const built = buildDocumentListFilter({
    category: searchParams.get('category'),
    tag: searchParams.get('tag'),
    q: searchParams.get('q'),
    includeExpired: searchParams.get('includeExpired') === '1',
  });

  if ('error' in built) {
    return jsonError(built.error, 400);
  }

  const documents = await InternalDocumentModel.find(built.filter).sort({
    updatedAt: -1,
  });

  const expiringOnly = searchParams.get('expiring') === '1';
  const filtered = expiringOnly
    ? documents.filter((doc) => isExpiringWithinDays(doc.expiresAt, 30))
    : documents;

  const sorted = expiringOnly ? sortByExpiryUrgency(filtered) : filtered;

  return NextResponse.json(sorted.map(serializeDocument));
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 문서를 등록할 수 없습니다', 403);
  }

  const body = await request.json();
  const { title, description, category, tags, externalUrl, expiresAt } = body;

  if (!title || !category) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  if (!isDocumentCategory(category)) {
    return jsonError('카테고리가 올바르지 않습니다', 400);
  }

  if (!externalUrl || typeof externalUrl !== 'string') {
    return jsonError('링크 URL을 입력해 주세요', 400);
  }

  const parsedExpiresAt = parseDocumentExpiresAt(expiresAt);
  if (parsedExpiresAt === null && expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    return jsonError('만료일 형식이 올바르지 않습니다', 400);
  }

  await dbConnect();

  const doc = await InternalDocumentModel.create({
    title: String(title).trim(),
    description: description ? String(description).trim() : undefined,
    category,
    tags: normalizeDocumentTags(Array.isArray(tags) ? tags.map(String) : []),
    entryType: 'Link',
    externalUrl: externalUrl.trim(),
    expiresAt: parsedExpiresAt ?? undefined,
    createdBy: new mongoose.Types.ObjectId(auth.session.user.userId),
  });

  return NextResponse.json(serializeDocument(doc), { status: 201 });
}
