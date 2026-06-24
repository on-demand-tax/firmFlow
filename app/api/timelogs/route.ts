import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isReadOnlyOnLeave } from '@/lib/permissions';
import { TimeLogModel } from '@/models/TimeLog';
import { isValidHours, TIMELOG_HOURS_RANGE_MESSAGE } from '@/lib/timelog-hours';
import {
  parseTimeLogDate,
  resolveTimeLogContent,
  serializeTimeLogsWithProjects,
  validateDailyHours,
} from '@/lib/timelog-helpers';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  await dbConnect();

  const filter =
    auth.session.user.role === 'Preparer'
      ? { userId: auth.session.user.userId }
      : {};

  const logs = await TimeLogModel.find(filter).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(await serializeTimeLogsWithProjects(logs));
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 타임로그를 작성할 수 없습니다', 403);
  }

  const body = await request.json();
  const { clientId, projectId, date, hours, description, activity } = body;

  if (!clientId || !projectId || !date || hours === undefined) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  if (!isValidHours(hours)) {
    return jsonError(TIMELOG_HOURS_RANGE_MESSAGE, 400);
  }

  const parsedDate = parseTimeLogDate(date);
  if (!parsedDate) {
    return jsonError('날짜 형식이 올바르지 않습니다', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(projectId)) {
    return jsonError('고객 또는 프로젝트 ID가 올바르지 않습니다', 400);
  }

  await dbConnect();

  const content = await resolveTimeLogContent({ projectId, description, activity });
  if (!content.ok) {
    return jsonError(content.error, content.status);
  }

  const withinDailyLimit = await validateDailyHours(
    auth.session.user.userId,
    parsedDate,
    hours,
  );
  if (!withinDailyLimit) {
    return jsonError('하루 최대 24시간을 초과할 수 없습니다', 400);
  }

  const log = await TimeLogModel.create({
    userId: auth.session.user.userId,
    clientId,
    projectId,
    date: parsedDate,
    hours,
    activity: content.activity,
    description: content.description,
    status: 'Pending',
  });

  const [serialized] = await serializeTimeLogsWithProjects([log]);
  return NextResponse.json(serialized, { status: 201 });
}
