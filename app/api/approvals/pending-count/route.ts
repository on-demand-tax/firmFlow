import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ExpenseModel } from '@/models/Expense';
import { TimeLogModel } from '@/models/TimeLog';

export async function GET() {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  await dbConnect();

  const [timeLogs, expenses] = await Promise.all([
    TimeLogModel.countDocuments({ status: 'Pending' }),
    ExpenseModel.countDocuments({ status: 'Pending' }),
  ]);

  return NextResponse.json({ timeLogs, expenses, total: timeLogs + expenses });
}
