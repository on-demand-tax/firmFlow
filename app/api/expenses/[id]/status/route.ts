import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { parseApprovalStatusPayload } from '@/lib/approval-helpers';
import { ExpenseModel } from '@/models/Expense';
import { serializeExpensesWithUsers } from '@/lib/expense-helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  const body = await request.json();
  const parsed = parseApprovalStatusPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.error, parsed.status);
  }

  await dbConnect();
  const expense = await ExpenseModel.findById(id);
  if (!expense) {
    return jsonError('경비를 찾을 수 없습니다', 404);
  }

  if (expense.lockedAt) {
    return jsonError('마감된 경비는 상태를 변경할 수 없습니다', 403);
  }

  expense.status = parsed.status;
  expense.approvedBy = new mongoose.Types.ObjectId(auth.session.user.userId);
  if (parsed.status === 'Rejected') {
    expense.rejectionReason = parsed.rejectionReason;
  } else {
    expense.set('rejectionReason', undefined, { strict: false });
  }
  await expense.save();

  const [serialized] = await serializeExpensesWithUsers([expense]);
  return NextResponse.json(serialized);
}
