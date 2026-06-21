import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { removePeriodLock } from '@/lib/period-lock';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('마감 기록을 찾을 수 없습니다', 404);
  }

  await dbConnect();
  const result = await removePeriodLock(id);

  if ('error' in result) {
    if (result.error === 'NOT_FOUND') {
      return jsonError('마감 기록을 찾을 수 없습니다', 404);
    }
    return jsonError('마감 해제에 실패했습니다', 500);
  }

  return NextResponse.json({ ok: true });
}
