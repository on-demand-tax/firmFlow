import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isDocumentCategory } from '@/lib/document-categories';
import { DOCUMENT_MAX_BYTES, resolveDocumentMimeType } from '@/lib/document-file';
import { parseDocumentExpiresAt, serializeDocument } from '@/lib/documents';
import { findOrCreateDocumentCategoryFolder } from '@/lib/drive/internal-documents';
import { mapDriveUploadError, uploadReceipt } from '@/lib/drive/upload';
import {
  canEditDocument,
  isReadOnlyOnLeave,
} from '@/lib/permissions';
import {
  InternalDocumentModel,
  normalizeDocumentTags,
} from '@/models/InternalDocument';

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 문서를 업로드할 수 없습니다', 403);
  }

  const formData = await request.formData();
  const fileEntry = formData.get('file');
  const title = formData.get('title');
  const category = formData.get('category');
  const description = formData.get('description');
  const tags = formData.get('tags');
  const expiresAt = formData.get('expiresAt');
  const documentId = formData.get('documentId');
  const note = formData.get('note');

  if (!(fileEntry instanceof File)) {
    return jsonError('파일을 선택해 주세요', 400);
  }

  if (fileEntry.size > DOCUMENT_MAX_BYTES) {
    return jsonError('파일 크기는 10MB 이하여야 합니다', 400);
  }

  const mimeType = resolveDocumentMimeType(fileEntry);
  if (!mimeType) {
    return jsonError('PDF, JPEG, PNG, XLSX, DOCX 파일만 업로드할 수 있습니다', 400);
  }

  if (!title || typeof title !== 'string') {
    return jsonError('제목을 입력해 주세요', 400);
  }

  if (!category || typeof category !== 'string' || !isDocumentCategory(category)) {
    return jsonError('카테고리가 올바르지 않습니다', 400);
  }

  const parsedExpiresAt = parseDocumentExpiresAt(
    typeof expiresAt === 'string' ? expiresAt : expiresAt === null ? null : undefined,
  );
  if (
    parsedExpiresAt === null &&
    expiresAt !== null &&
    expiresAt !== undefined &&
    expiresAt !== ''
  ) {
    return jsonError('만료일 형식이 올바르지 않습니다', 400);
  }

  const parsedTags = normalizeDocumentTags(
    typeof tags === 'string' && tags.length > 0
      ? tags.split(',').map((tag) => tag.trim())
      : [],
  );

  await dbConnect();

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  let folderId: string;

  try {
    folderId = await findOrCreateDocumentCategoryFolder(category);
  } catch (error) {
    return jsonError(mapDriveUploadError(error), 500);
  }

  let uploaded: { id: string; webViewLink: string };
  try {
    uploaded = await uploadReceipt(
      { name: fileEntry.name, mimeType, buffer },
      folderId,
    );
  } catch (error) {
    return jsonError(mapDriveUploadError(error), 500);
  }

  const userId = new mongoose.Types.ObjectId(auth.session.user.userId);
  const versionEntry = {
    googleDriveFileId: uploaded.id,
    fileUrl: uploaded.webViewLink,
    fileName: fileEntry.name,
    mimeType,
    uploadedBy: userId,
    uploadedAt: new Date(),
    note: typeof note === 'string' && note.trim() ? note.trim() : undefined,
  };

  if (documentId && typeof documentId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return jsonError('문서 ID가 올바르지 않습니다', 400);
    }

    const doc = await InternalDocumentModel.findById(documentId);
    if (!doc) {
      return jsonError('문서를 찾을 수 없습니다', 404);
    }

    if (doc.entryType !== 'File') {
      return jsonError('링크 문서에는 버전을 추가할 수 없습니다', 400);
    }

    if (!canEditDocument(auth.session.user, { createdBy: doc.createdBy.toString() })) {
      return jsonError('권한이 없습니다', 403);
    }

    const nextVersion = (doc.currentVersion ?? doc.versions.length) + 1;
    doc.versions.push({ version: nextVersion, ...versionEntry });
    doc.currentVersion = nextVersion;

    if (title.trim()) {
      doc.title = title.trim();
    }

    await doc.save();
    return NextResponse.json(serializeDocument(doc));
  }

  const doc = await InternalDocumentModel.create({
    title: title.trim(),
    description:
      typeof description === 'string' && description.trim() ? description.trim() : undefined,
    category,
    tags: parsedTags,
    entryType: 'File',
    expiresAt: parsedExpiresAt ?? undefined,
    createdBy: userId,
    currentVersion: 1,
    versions: [{ version: 1, ...versionEntry }],
  });

  return NextResponse.json(serializeDocument(doc), { status: 201 });
}
