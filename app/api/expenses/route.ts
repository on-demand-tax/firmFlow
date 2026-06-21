import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { isReadOnlyOnLeave } from '@/lib/permissions';
import { ExpenseModel } from '@/models/Expense';
import {
  isValidAmount,
  parseExpenseDate,
  serializeExpense,
  validateProjectBelongsToClient,
} from '@/lib/expense-helpers';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  await dbConnect();

  const filter =
    auth.session.user.role === 'Preparer'
      ? { userId: auth.session.user.userId }
      : {};

  const expenses = await ExpenseModel.find(filter).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(expenses.map(serializeExpense));
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 경비를 작성할 수 없습니다', 403);
  }

  const body = await request.json();
  const { expenseType, clientId, projectId, amount, date, description } = body;

  if (!expenseType || amount === undefined || !date || !description) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  if (expenseType !== 'Core' && expenseType !== 'Overhead') {
    return jsonError('경비 유형이 올바르지 않습니다', 400);
  }

  if (!isValidAmount(amount)) {
    return jsonError('금액은 0 이상이어야 합니다', 400);
  }

  const parsedDate = parseExpenseDate(date);
  if (!parsedDate) {
    return jsonError('날짜 형식이 올바르지 않습니다', 400);
  }

  await dbConnect();

  if (expenseType === 'Core') {
    if (!clientId || !projectId) {
      return jsonError('프로젝트 경비는 고객과 프로젝트가 필요합니다', 400);
    }

    if (
      !mongoose.Types.ObjectId.isValid(clientId) ||
      !mongoose.Types.ObjectId.isValid(projectId)
    ) {
      return jsonError('고객 또는 프로젝트 ID가 올바르지 않습니다', 400);
    }

    const belongs = await validateProjectBelongsToClient(projectId, clientId);
    if (!belongs) {
      return jsonError('프로젝트가 해당 고객에 속하지 않습니다', 400);
    }
  }

  const expense = await ExpenseModel.create({
    userId: auth.session.user.userId,
    clientId: expenseType === 'Core' ? clientId : null,
    projectId: expenseType === 'Core' ? projectId : null,
    expenseType,
    amount,
    date: parsedDate,
    description: String(description).trim(),
    status: 'Pending',
  });

  return NextResponse.json(serializeExpense(expense), { status: 201 });
}
