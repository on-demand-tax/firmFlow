import { parseDateOnlySeoul } from '@/lib/dates';
import { resolveExpenseCurrency, type ExpenseCurrency } from '@/lib/currency';
import { parseExpenseFilingPeriod } from '@/lib/expense-filing-periods';
import { parseExpensePaymentMethod } from '@/lib/expense-payment-methods';
import { parseExpensePurpose } from '@/lib/expense-purposes';
import { ProjectModel } from '@/models/Project';
import { UserModel } from '@/models/User';
import type { IExpense } from '@/models/Expense';

export function expenseCurrency(expense: { currency?: ExpenseCurrency | null }): ExpenseCurrency {
  return expense.currency ?? 'KRW';
}

export function serializeExpense(
  expense: IExpense,
  options?: { userName?: string; userEmail?: string },
) {
  const googleDriveFileId = expense.googleDriveFileId;
  const receiptUrl =
    expense.receiptUrl ??
    (googleDriveFileId
      ? `https://drive.google.com/file/d/${googleDriveFileId}/view`
      : undefined);

  return {
    _id: String(expense._id),
    userId: String(expense.userId),
    userName: options?.userName,
    userEmail: options?.userEmail,
    clientId: expense.clientId ? String(expense.clientId) : undefined,
    projectId: expense.projectId ? String(expense.projectId) : undefined,
    expenseType: expense.expenseType,
    paymentMethod: expense.paymentMethod,
    expensePurpose: expense.expensePurpose,
    filingPeriod: expense.filingPeriod ?? undefined,
    amount: expense.amount,
    currency: expenseCurrency(expense),
    date: expense.date,
    receiptUrl,
    googleDriveFileId,
    description: expense.description,
    notes: expense.notes?.trim() || undefined,
    status: expense.status,
    lockedAt: expense.lockedAt ?? undefined,
    approvedBy: expense.approvedBy ? String(expense.approvedBy) : undefined,
    rejectionReason: expense.rejectionReason,
  };
}

export async function serializeExpensesWithUsers(expenses: IExpense[]) {
  const userIds = [...new Set(expenses.map((expense) => String(expense.userId)))];
  const users = await UserModel.find({ _id: { $in: userIds } }).select('name email');
  const userById = new Map(
    users.map((u) => [String(u._id), { name: u.name, email: u.email }] as const),
  );

  return expenses.map((expense) => {
    const author = userById.get(String(expense.userId));
    return serializeExpense(expense, {
      userName: author?.name,
      userEmail: author?.email,
    });
  });
}

export function parseExpenseCurrency(value: unknown): ExpenseCurrency | null {
  const resolved = resolveExpenseCurrency(value);
  if (resolved === 'invalid') return null;
  if (resolved === 'missing') return 'KRW';
  return resolved;
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

export function parseExpenseNotes(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function validateExpenseClassificationFields(body: {
  paymentMethod?: unknown;
  expensePurpose?: unknown;
  filingPeriod?: unknown;
  notes?: unknown;
}):
  | { ok: true; paymentMethod: NonNullable<ReturnType<typeof parseExpensePaymentMethod>>; expensePurpose: NonNullable<ReturnType<typeof parseExpensePurpose>>; filingPeriod: ReturnType<typeof parseExpenseFilingPeriod>; notes?: string }
  | { ok: false; error: string } {
  const paymentMethod = parseExpensePaymentMethod(body.paymentMethod);
  if (!paymentMethod) {
    return { ok: false, error: '지출 방법을 선택해 주세요' };
  }

  const expensePurpose = parseExpensePurpose(body.expensePurpose);
  if (!expensePurpose) {
    return { ok: false, error: '지출 용도를 선택해 주세요' };
  }

  if (
    body.filingPeriod !== undefined &&
    body.filingPeriod !== null &&
    body.filingPeriod !== '' &&
    !parseExpenseFilingPeriod(body.filingPeriod)
  ) {
    return { ok: false, error: '관련 신고 기간이 올바르지 않습니다' };
  }

  return {
    ok: true,
    paymentMethod,
    expensePurpose,
    filingPeriod: parseExpenseFilingPeriod(body.filingPeriod),
    notes: parseExpenseNotes(body.notes),
  };
}
