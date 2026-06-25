import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession, requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isDocumentCategory } from '@/lib/document-categories';
import { parseDocumentExpiresAt, serializeDocument } from '@/lib/documents';
import {
  canChangeDocumentCategory,
  canDeleteDocument,
  canEditDocument,
  isReadOnlyOnLeave,
} from '@/lib/permissions';
import {
  InternalDocumentModel,
  normalizeDocumentTags,
} from '@/models/InternalDocument';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('문서 ID가 올바르지 않습니다', 400);
  }

  await dbConnect();

  const doc = await InternalDocumentModel.findById(id);
  if (!doc) {
    return jsonError('문서를 찾을 수 없습니다', 404);
  }

  return NextResponse.json(serializeDocument(doc));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 문서를 수정할 수 없습니다', 403);
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('문서 ID가 올바르지 않습니다', 400);
  }

  const body = await request.json();

  await dbConnect();

  const doc = await InternalDocumentModel.findById(id);
  if (!doc) {
    return jsonError('문서를 찾을 수 없습니다', 404);
  }

  if (!canEditDocument(auth.session.user, { createdBy: doc.createdBy.toString() })) {
    return jsonError('권한이 없습니다', 403);
  }

  if (body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string') {
      return jsonError('제목을 입력해 주세요', 400);
    }
    doc.title = body.title.trim();
  }

  if (body.description !== undefined) {
    doc.description = body.description ? String(body.description).trim() : undefined;
  }

  if (body.tags !== undefined) {
    doc.tags = normalizeDocumentTags(Array.isArray(body.tags) ? body.tags.map(String) : []);
  }

  if (body.externalUrl !== undefined) {
    if (doc.entryType !== 'Link') {
      return jsonError('파일 문서는 링크를 수정할 수 없습니다', 400);
    }
    if (!body.externalUrl || typeof body.externalUrl !== 'string') {
      return jsonError('링크 URL을 입력해 주세요', 400);
    }
    doc.externalUrl = body.externalUrl.trim();
  }

  if (body.expiresAt !== undefined) {
    const parsed = parseDocumentExpiresAt(body.expiresAt);
    if (parsed === null && body.expiresAt !== null && body.expiresAt !== '') {
      return jsonError('만료일 형식이 올바르지 않습니다', 400);
    }
    doc.expiresAt = parsed ?? undefined;
  }

  if (body.category !== undefined) {
    if (!canChangeDocumentCategory(auth.session.user)) {
      return jsonError('권한이 없습니다', 403);
    }
    if (!isDocumentCategory(body.category)) {
      return jsonError('카테고리가 올바르지 않습니다', 400);
    }
    doc.category = body.category;
  }

  if (body.currentVersion !== undefined) {
    if (doc.entryType !== 'File') {
      return jsonError('링크 문서는 버전을 변경할 수 없습니다', 400);
    }

    const version = Number(body.currentVersion);
    if (!Number.isInteger(version) || version < 1) {
      return jsonError('버전이 올바르지 않습니다', 400);
    }

    const exists = doc.versions.some(
      (item: { version: number }) => item.version === version,
    );
    if (!exists) {
      return jsonError('해당 버전을 찾을 수 없습니다', 400);
    }

    doc.currentVersion = version;
  }

  await doc.save();
  return NextResponse.json(serializeDocument(doc));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('문서 ID가 올바르지 않습니다', 400);
  }

  await dbConnect();

  const doc = await InternalDocumentModel.findByIdAndDelete(id);
  if (!doc) {
    return jsonError('문서를 찾을 수 없습니다', 404);
  }

  return NextResponse.json({ ok: true });
}
