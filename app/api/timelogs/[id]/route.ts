import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { canEditTimeLog, isReadOnlyOnLeave } from '@/lib/permissions';
import { TimeLogModel } from '@/models/TimeLog';
import { isValidHours, TIMELOG_HOURS_RANGE_MESSAGE } from '@/lib/timelog-hours';
import {
  parseTimeLogDate,
  resolveTimeLogContent,
  serializeTimeLogsWithProjects,
  validateDailyHours,
} from '@/lib/timelog-helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 타임로그를 수정할 수 없습니다', 403);
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  await dbConnect();
  const log = await TimeLogModel.findById(id);
  if (!log) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  if (log.lockedAt) {
    return jsonError('마감된 타임로그는 수정할 수 없습니다', 403);
  }

  if (
    !canEditTimeLog(
      { userId: auth.session.user.userId, role: auth.session.user.role },
      {
        userId: String(log.userId),
        status: log.status,
        lockedAt: log.lockedAt,
      },
    )
  ) {
    return jsonError('권한이 없습니다', 403);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.clientId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(body.clientId)) {
      return jsonError('고객 ID가 올바르지 않습니다', 400);
    }
    updates.clientId = body.clientId;
  }

  if (body.projectId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(body.projectId)) {
      return jsonError('프로젝트 ID가 올바르지 않습니다', 400);
    }
    updates.projectId = body.projectId;
  }

  if (body.date !== undefined) {
    const parsedDate = parseTimeLogDate(body.date);
    if (!parsedDate) {
      return jsonError('날짜 형식이 올바르지 않습니다', 400);
    }
    updates.date = parsedDate;
  }

  if (body.hours !== undefined) {
    if (!isValidHours(body.hours)) {
      return jsonError(TIMELOG_HOURS_RANGE_MESSAGE, 400);
    }
    updates.hours = body.hours;
  }

  if (body.description !== undefined || body.activity !== undefined || body.projectId !== undefined) {
    const content = await resolveTimeLogContent({
      projectId: String(updates.projectId ?? log.projectId),
      description: body.description !== undefined ? body.description : log.description,
      activity: body.activity !== undefined ? body.activity : log.activity,
    });
    if (!content.ok) {
      return jsonError(content.error, content.status);
    }
    updates.description = content.description;
    updates.activity = content.activity;
  }

  const nextDate = (updates.date as Date | undefined) ?? log.date;
  const nextHours = (updates.hours as number | undefined) ?? log.hours;

  const withinDailyLimit = await validateDailyHours(
    String(log.userId),
    nextDate,
    nextHours,
    id,
  );
  if (!withinDailyLimit) {
    return jsonError('하루 최대 24시간을 초과할 수 없습니다', 400);
  }

  Object.assign(log, updates);
  await log.save();

  const [serialized] = await serializeTimeLogsWithProjects([log]);
  return NextResponse.json(serialized);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 타임로그를 삭제할 수 없습니다', 403);
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  await dbConnect();
  const log = await TimeLogModel.findById(id);
  if (!log) {
    return jsonError('타임로그를 찾을 수 없습니다', 404);
  }

  if (log.lockedAt) {
    return jsonError('마감된 타임로그는 삭제할 수 없습니다', 403);
  }

  if (
    !canEditTimeLog(
      { userId: auth.session.user.userId, role: auth.session.user.role },
      {
        userId: String(log.userId),
        status: log.status,
        lockedAt: log.lockedAt,
      },
    )
  ) {
    return jsonError('권한이 없습니다', 403);
  }

  await log.deleteOne();
  return NextResponse.json({ ok: true });
}
