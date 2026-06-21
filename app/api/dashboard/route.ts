import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { parseDashboardPeriod } from '@/lib/dashboard';
import { calculateProjectCost } from '@/lib/billingUtils';
import { ClientModel } from '@/models/Client';
import { ExpenseModel } from '@/models/Expense';
import { ProjectModel } from '@/models/Project';
import { TimeLogModel } from '@/models/TimeLog';
import { UserModel } from '@/models/User';
import type { ISalaryHistory } from '@/models/User';

interface ProjectRow {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  hours: number;
  laborCost: number;
  coreExpense: number;
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const period = parseDashboardPeriod(searchParams);
  if ('error' in period) {
    return jsonError(period.error, 400);
  }

  const clientIdFilter = searchParams.get('clientId');
  const projectIdFilter = searchParams.get('projectId');

  if (clientIdFilter && !mongoose.Types.ObjectId.isValid(clientIdFilter)) {
    return jsonError('고객 ID가 올바르지 않습니다', 400);
  }
  if (projectIdFilter && !mongoose.Types.ObjectId.isValid(projectIdFilter)) {
    return jsonError('프로젝트 ID가 올바르지 않습니다', 400);
  }

  await dbConnect();

  const isPreparer = auth.session.user.role === 'Preparer';
  const userId = auth.session.user.userId;

  const dateFilter = { $gte: period.start, $lte: period.end };
  const baseTimeLogFilter: Record<string, unknown> = { date: dateFilter };
  const baseExpenseFilter: Record<string, unknown> = { date: dateFilter };

  if (isPreparer) {
    baseTimeLogFilter.userId = userId;
    baseExpenseFilter.userId = userId;
  }
  if (clientIdFilter) {
    baseTimeLogFilter.clientId = clientIdFilter;
    baseExpenseFilter.clientId = clientIdFilter;
  }
  if (projectIdFilter) {
    baseTimeLogFilter.projectId = projectIdFilter;
    baseExpenseFilter.projectId = projectIdFilter;
  }

  const [approvedLogs, pendingTimeLogCount, approvedCoreExpenses, pendingExpenseCount, approvedOverheadExpenses] =
    await Promise.all([
      TimeLogModel.find({ ...baseTimeLogFilter, status: 'Approved' }).lean(),
      TimeLogModel.countDocuments({ ...baseTimeLogFilter, status: 'Pending' }),
      ExpenseModel.find({
        ...baseExpenseFilter,
        expenseType: 'Core',
        status: 'Approved',
      }).lean(),
      ExpenseModel.countDocuments({ ...baseExpenseFilter, status: 'Pending' }),
      ExpenseModel.find({
        date: dateFilter,
        expenseType: 'Overhead',
        status: 'Approved',
        ...(isPreparer ? { userId } : {}),
      }).lean(),
    ]);

  const userIds = [...new Set(approvedLogs.map((log) => String(log.userId)))];
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select('+salaryTable')
    .lean();
  const salaryByUser = new Map<string, ISalaryHistory[]>(
    users.map((u) => [
      String(u._id),
      (u.salaryTable ?? []).map((entry) => ({
        effectiveDate: entry.effectiveDate,
        baseSalary: entry.baseSalary,
        hourlyBillableRate: entry.hourlyBillableRate,
      })),
    ]),
  );

  const projectIds = new Set<string>();
  for (const log of approvedLogs) {
    projectIds.add(String(log.projectId));
  }
  for (const expense of approvedCoreExpenses) {
    if (expense.projectId) {
      projectIds.add(String(expense.projectId));
    }
  }

  const projects = await ProjectModel.find({
    _id: { $in: [...projectIds] },
  }).lean();
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  const clientIds = [...new Set(projects.map((p) => String(p.clientId)))];
  const clients = await ClientModel.find({ _id: { $in: clientIds } }).lean();
  const clientMap = new Map(clients.map((c) => [String(c._id), c]));

  const projectRows = new Map<string, ProjectRow>();

  function ensureProjectRow(projectIdStr: string): ProjectRow | null {
    if (projectRows.has(projectIdStr)) {
      return projectRows.get(projectIdStr)!;
    }
    const project = projectMap.get(projectIdStr);
    if (!project) return null;
    const client = clientMap.get(String(project.clientId));
    const row: ProjectRow = {
      projectId: projectIdStr,
      projectName: project.projectName,
      clientId: String(project.clientId),
      clientName: client?.name ?? '',
      hours: 0,
      laborCost: 0,
      coreExpense: 0,
    };
    projectRows.set(projectIdStr, row);
    return row;
  }

  let totalHours = 0;
  let totalLaborCost = 0;

  for (const log of approvedLogs) {
    const projectIdStr = String(log.projectId);
    const row = ensureProjectRow(projectIdStr);
    if (!row) continue;

    const salaryTable = salaryByUser.get(String(log.userId)) ?? [];
    const cost = calculateProjectCost(log.hours, log.date, salaryTable);

    row.hours += log.hours;
    row.laborCost += cost;
    totalHours += log.hours;
    totalLaborCost += cost;
  }

  let totalCoreExpense = 0;
  for (const expense of approvedCoreExpenses) {
    if (!expense.projectId) continue;
    const projectIdStr = String(expense.projectId);
    const row = ensureProjectRow(projectIdStr);
    if (!row) continue;
    row.coreExpense += expense.amount;
    totalCoreExpense += expense.amount;
  }

  const totalOverhead = approvedOverheadExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const sortedProjects = [...projectRows.values()].sort((a, b) =>
    a.projectName.localeCompare(b.projectName, 'ko'),
  );

  return NextResponse.json({
    period: { from: period.from, to: period.to },
    summary: {
      totalHours,
      totalLaborCost,
      totalCoreExpense,
      totalOverhead,
      pendingTimeLogCount,
      pendingExpenseCount,
    },
    projects: sortedProjects,
    overhead: { amount: totalOverhead },
  });
}
