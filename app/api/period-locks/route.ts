import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { PeriodLockModel } from '@/models/PeriodLock';
import { applyPeriodLock } from '@/lib/period-lock';
import { getMonthRangeSeoul, parseDateOnlySeoul } from '@/lib/dates';

function serializePeriodLock(lock: {
  _id: unknown;
  startDate: Date;
  endDate: Date;
  lockedBy: unknown;
  lockedAt: Date;
  note?: string;
}) {
  return {
    _id: String(lock._id),
    startDate: lock.startDate,
    endDate: lock.endDate,
    lockedBy: String(lock.lockedBy),
    lockedAt: lock.lockedAt,
    note: lock.note,
  };
}

export async function GET() {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const locks = await PeriodLockModel.find().sort({ startDate: -1 });
  return NextResponse.json(locks.map(serializePeriodLock));
}

export async function POST(request: Request) {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  const body = await request.json();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (body.year !== undefined && body.month !== undefined) {
    const year = Number(body.year);
    const month = Number(body.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return jsonError('연·월 형식이 올바르지 않습니다', 400);
    }
    const range = getMonthRangeSeoul(year, month);
    startDate = range.start;
    endDate = range.end;
  } else if (body.startDate && body.endDate) {
    startDate = parseDateOnlySeoul(String(body.startDate));
    endDate = parseDateOnlySeoul(String(body.endDate));
    if (!startDate || !endDate) {
      return jsonError('날짜 형식이 올바르지 않습니다', 400);
    }
    const endDay = parseDateOnlySeoul(String(body.endDate))!;
    endDate = new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else {
    return jsonError('마감 기간을 지정해 주세요', 400);
  }

  if (startDate > endDate) {
    return jsonError('시작일은 종료일보다 이전이어야 합니다', 400);
  }

  await dbConnect();
  const result = await applyPeriodLock(
    startDate,
    endDate,
    auth.session.user.userId,
    body.note ? String(body.note) : undefined,
  );

  if ('error' in result) {
    if (result.error === 'OVERLAP') {
      return jsonError('겹치는 마감 기간이 이미 존재합니다', 409);
    }
    return jsonError('마감 처리에 실패했습니다', 500);
  }

  return NextResponse.json(serializePeriodLock(result.lock), { status: 201 });
}
