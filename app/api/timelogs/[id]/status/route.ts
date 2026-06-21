import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { TimeLogModel } from '@/models/TimeLog';
import { serializeTimeLog } from '@/lib/timelog-helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  const body = await request.json();
  const { status } = body;

  if (status !== 'Approved' && status !== 'Rejected') {
    return jsonError('승인 상태가 올바르지 않습니다', 400);
  }

  await dbConnect();
  const log = await TimeLogModel.findById(id);
  if (!log) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  if (log.lockedAt) {
    return jsonError('마감된 타임로그는 상태를 변경할 수 없습니다', 403);
  }

  log.status = status;
  log.approvedBy = new mongoose.Types.ObjectId(auth.session.user.userId);
  await log.save();

  return NextResponse.json(serializeTimeLog(log));
}
