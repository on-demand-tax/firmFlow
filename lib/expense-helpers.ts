import { parseDateOnlySeoul } from '@/lib/dates';
import { ProjectModel } from '@/models/Project';
import type { IExpense } from '@/models/Expense';

export function serializeExpense(expense: IExpense) {
  return {
    _id: String(expense._id),
    userId: String(expense.userId),
    clientId: expense.clientId ? String(expense.clientId) : undefined,
    projectId: expense.projectId ? String(expense.projectId) : undefined,
    expenseType: expense.expenseType,
    amount: expense.amount,
    date: expense.date,
    receiptUrl: expense.receiptUrl,
    googleDriveFileId: expense.googleDriveFileId,
    description: expense.description,
    status: expense.status,
    lockedAt: expense.lockedAt ?? undefined,
    approvedBy: expense.approvedBy ? String(expense.approvedBy) : undefined,
  };
}

export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && amount >= 0;
}

export function parseExpenseDate(dateInput: unknown): Date | null {
  if (typeof dateInput !== 'string') return null;
  return parseDateOnlySeoul(dateInput);
}

export async function validateProjectBelongsToClient(
  projectId: string,
  clientId: string,
): Promise<boolean> {
  const project = await ProjectModel.findById(projectId).select('clientId');
  if (!project) return false;
  return String(project.clientId) === clientId;
}
