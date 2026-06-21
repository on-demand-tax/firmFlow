import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isReadOnlyOnLeave } from '@/lib/permissions';
import { ClientModel } from '@/models/Client';
import { ExpenseModel } from '@/models/Expense';
import { findOrCreateOverheadReceiptsFolder, uploadReceipt } from '@/lib/drive/upload';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 영수증을 업로드할 수 없습니다', 403);
  }

  const formData = await request.formData();
  const fileEntry = formData.get('file');
  const expenseType = formData.get('expenseType');
  const clientId = formData.get('clientId');
  const expenseId = formData.get('expenseId');

  if (!(fileEntry instanceof File)) {
    return jsonError('파일을 선택해 주세요', 400);
  }

  if (expenseType !== 'Core' && expenseType !== 'Overhead') {
    return jsonError('경비 유형이 올바르지 않습니다', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(fileEntry.type)) {
    return jsonError('PDF, JPEG, PNG 파일만 업로드할 수 있습니다', 400);
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    return jsonError('파일 크기는 10MB 이하여야 합니다', 400);
  }

  await dbConnect();

  let folderId: string;

  if (expenseType === 'Core') {
    if (!clientId || typeof clientId !== 'string') {
      return jsonError('프로젝트 경비는 고객이 필요합니다', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return jsonError('고객 ID가 올바르지 않습니다', 400);
    }

    const client = await ClientModel.findById(clientId).select('googleDriveFolderId');
    if (!client) {
      return jsonError('고객을 찾을 수 없습니다', 404);
    }
    folderId = client.googleDriveFolderId;
  } else {
    folderId = await findOrCreateOverheadReceiptsFolder();
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const uploaded = await uploadReceipt(
    {
      name: fileEntry.name,
      mimeType: fileEntry.type,
      buffer,
    },
    folderId,
  );

  if (expenseId && typeof expenseId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return jsonError('경비를 찾을 수 없습니다', 404);
    }

    const expense = await ExpenseModel.findById(expenseId);
    if (!expense) {
      return jsonError('경비를 찾을 수 없습니다', 404);
    }

    if (
      auth.session.user.role === 'Preparer' &&
      String(expense.userId) !== auth.session.user.userId
    ) {
      return jsonError('권한이 없습니다', 403);
    }

    expense.googleDriveFileId = uploaded.id;
    expense.receiptUrl = uploaded.webViewLink;
    await expense.save();
  }

  return NextResponse.json(uploaded);
}
