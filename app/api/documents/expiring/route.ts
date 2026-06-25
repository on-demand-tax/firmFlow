import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { serializeDocument } from '@/lib/documents';
import { isExpiringWithinDays, sortByExpiryUrgency } from '@/lib/document-expiry';
import { InternalDocumentModel } from '@/models/InternalDocument';

export async function GET(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const withinDays = Number(searchParams.get('withinDays') ?? '30');
  if (!Number.isFinite(withinDays) || withinDays < 0) {
    return jsonError('기간이 올바르지 않습니다', 400);
  }

  await dbConnect();

  const documents = await InternalDocumentModel.find({
    expiresAt: { $ne: null },
  });

  const expiring = sortByExpiryUrgency(
    documents.filter((doc) => isExpiringWithinDays(doc.expiresAt, withinDays)),
  );

  return NextResponse.json(expiring.map(serializeDocument));
}
