import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { canEditExpense, isReadOnlyOnLeave } from '@/lib/permissions';
import { ExpenseModel } from '@/models/Expense';
import {
  isValidAmount,
  parseExpenseDate,
  parseExpenseCurrency,
  serializeExpense,
  validateProjectBelongsToClient,
} from '@/lib/expense-helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 경비를 수정할 수 없습니다', 403);
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  await dbConnect();
  const expense = await ExpenseModel.findById(id);
  if (!expense) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  if (expense.lockedAt) {
    return jsonError('마감된 경비는 수정할 수 없습니다', 403);
  }

  if (
    !canEditExpense(
      { userId: auth.session.user.userId, role: auth.session.user.role },
      {
        userId: String(expense.userId),
        status: expense.status,
        lockedAt: expense.lockedAt,
      },
    )
  ) {
    return jsonError('권한이 없습니다', 403);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.expenseType !== undefined) {
    if (body.expenseType !== 'Core' && body.expenseType !== 'Overhead') {
      return jsonError('경비 유형이 올바르지 않습니다', 400);
    }
    updates.expenseType = body.expenseType;
  }

  if (body.clientId !== undefined) {
    if (body.clientId === null || body.clientId === '') {
      updates.clientId = null;
    } else if (!mongoose.Types.ObjectId.isValid(body.clientId)) {
      return jsonError('고객 ID가 올바르지 않습니다', 400);
    } else {
      updates.clientId = body.clientId;
    }
  }

  if (body.projectId !== undefined) {
    if (body.projectId === null || body.projectId === '') {
      updates.projectId = null;
    } else if (!mongoose.Types.ObjectId.isValid(body.projectId)) {
      return jsonError('프로젝트 ID가 올바르지 않습니다', 400);
    } else {
      updates.projectId = body.projectId;
    }
  }

  if (body.amount !== undefined) {
    if (!isValidAmount(body.amount)) {
      return jsonError('금액은 0 이상이어야 합니다', 400);
    }
    updates.amount = body.amount;
  }

  if (body.currency !== undefined) {
    const parsedCurrency = parseExpenseCurrency(body.currency);
    if (!parsedCurrency) {
      return jsonError('통화는 KRW 또는 USD만 선택할 수 있습니다', 400);
    }
    updates.currency = parsedCurrency;
  }

  if (body.date !== undefined) {
    const parsedDate = parseExpenseDate(body.date);
    if (!parsedDate) {
      return jsonError('날짜 형식이 올바르지 않습니다', 400);
    }
    updates.date = parsedDate;
  }

  if (body.description !== undefined) {
    updates.description = String(body.description).trim();
  }

  const nextType = (updates.expenseType as 'Core' | 'Overhead' | undefined) ?? expense.expenseType;
  const nextClientId =
    updates.clientId !== undefined ? updates.clientId : expense.clientId;
  const nextProjectId =
    updates.projectId !== undefined ? updates.projectId : expense.projectId;

  if (nextType === 'Core') {
    if (!nextClientId || !nextProjectId) {
      return jsonError('프로젝트 경비는 고객과 프로젝트가 필요합니다', 400);
    }

    const belongs = await validateProjectBelongsToClient(
      String(nextProjectId),
      String(nextClientId),
    );
    if (!belongs) {
      return jsonError('프로젝트가 해당 고객에 속하지 않습니다', 400);
    }
  }

  Object.assign(expense, updates);
  await expense.save();

  return NextResponse.json(serializeExpense(expense));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  if (isReadOnlyOnLeave(auth.session.user.status)) {
    return jsonError('휴직 중에는 경비를 삭제할 수 없습니다', 403);
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  await dbConnect();
  const expense = await ExpenseModel.findById(id);
  if (!expense) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  if (expense.lockedAt) {
    return jsonError('마감된 경비는 삭제할 수 없습니다', 403);
  }

  if (
    !canEditExpense(
      { userId: auth.session.user.userId, role: auth.session.user.role },
      {
        userId: String(expense.userId),
        status: expense.status,
        lockedAt: expense.lockedAt,
      },
    )
  ) {
    return jsonError('권한이 없습니다', 403);
  }

  await expense.deleteOne();
  return NextResponse.json({ ok: true });
}
