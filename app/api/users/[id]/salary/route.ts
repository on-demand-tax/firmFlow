import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { parseDateOnlySeoul } from '@/lib/dates';
import {
  hasDuplicateEffectiveDate,
  serializeSalaryEntry,
} from '@/lib/user-helpers';
import { UserModel, type ISalaryHistory } from '@/models/User';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('사용자 ID가 올바르지 않습니다', 400);
  }

  await dbConnect();
  const user = await UserModel.findById(id).select('+salaryTable');
  if (!user) {
    return jsonError('사용자를 찾을 수 없습니다', 404);
  }

  const salaryTable = [...user.salaryTable]
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    .map(serializeSalaryEntry);

  return NextResponse.json({
    _id: String(user._id),
    name: user.name,
    email: user.email,
    salaryTable,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('Admin');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('사용자 ID가 올바르지 않습니다', 400);
  }

  const body = await request.json();
  const { effectiveDate, baseSalary, hourlyBillableRate } = body;

  if (!effectiveDate || baseSalary === undefined || hourlyBillableRate === undefined) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  const parsedDate = parseDateOnlySeoul(String(effectiveDate));
  if (!parsedDate) {
    return jsonError('날짜 형식이 올바르지 않습니다', 400);
  }

  if (typeof baseSalary !== 'number' || baseSalary < 0) {
    return jsonError('기본급이 올바르지 않습니다', 400);
  }

  if (typeof hourlyBillableRate !== 'number' || hourlyBillableRate < 0) {
    return jsonError('시간당 단가가 올바르지 않습니다', 400);
  }

  await dbConnect();
  const user = await UserModel.findById(id).select('+salaryTable');
  if (!user) {
    return jsonError('사용자를 찾을 수 없습니다', 404);
  }

  if (hasDuplicateEffectiveDate(user.salaryTable, parsedDate)) {
    return jsonError('동일한 적용일의 급여 이력이 이미 존재합니다', 400);
  }

  user.salaryTable.push({
    effectiveDate: parsedDate,
    baseSalary,
    hourlyBillableRate,
  });
  user.salaryTable.sort(
    (a: ISalaryHistory, b: ISalaryHistory) =>
      a.effectiveDate.getTime() - b.effectiveDate.getTime(),
  );
  await user.save();

  return NextResponse.json({
    _id: String(user._id),
    name: user.name,
    email: user.email,
    salaryTable: user.salaryTable.map(serializeSalaryEntry),
  });
}
