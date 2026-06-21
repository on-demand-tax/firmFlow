import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { serializeUser } from '@/lib/user-helpers';
import { UserModel } from '@/models/User';

export async function GET() {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const users = await UserModel.find().sort({ name: 1 });
  return NextResponse.json(users.map(serializeUser));
}
