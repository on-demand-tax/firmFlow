import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { serializeUser } from '@/lib/user-helpers';
import { UserModel } from '@/models/User';
import type { UserRole, UserStatus } from '@/lib/permissions';

const VALID_ROLES: UserRole[] = ['Admin', 'Approver', 'Preparer'];
const VALID_STATUSES: UserStatus[] = ['Active', 'OnLeave', 'Terminated'];

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
  const updates: Partial<{ role: UserRole; status: UserStatus }> = {};

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return jsonError('역할이 올바르지 않습니다', 400);
    }
    updates.role = body.role;
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return jsonError('상태가 올바르지 않습니다', 400);
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('변경할 항목을 입력해 주세요', 400);
  }

  await dbConnect();

  const user = await UserModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return jsonError('사용자를 찾을 수 없습니다', 404);
  }

  return NextResponse.json(serializeUser(user));
}
