'use client';

import { useCallback, useEffect, useState } from 'react';

import { SimpleModal } from '@/components/app/SimpleModal';
import {
  DataRecordActions,
  DataRecordCard,
  DataRecordRow,
} from '@/components/app/DataRecordCard';
import { ResponsiveDataView } from '@/components/app/ResponsiveDataView';
import {
  ExpenseForm,
  type ClientOption,
  type ExpenseFormInitialValues,
  type ExpenseFormValues,
  type ProjectOption,
} from '@/components/app/ExpenseForm';
import { formatMoney, type ExpenseCurrency } from '@/lib/currency';
import { toDateInputValue } from '@/lib/dates';
import { getExpenseFilingPeriodLabel, type ExpenseFilingPeriod } from '@/lib/expense-filing-periods';
import {
  getExpensePaymentMethodLabel,
  type ExpensePaymentMethod,
} from '@/lib/expense-payment-methods';
import { getExpensePurposeLabel, type ExpensePurpose } from '@/lib/expense-purposes';
import { canPreparerEditEntry } from '@/lib/entry-editability';
import { lockedEntryClass, lockedEntryTitle } from '@/lib/locked-entry-styles';
import { tableWrapCell, tableWrapCellSm } from '@/lib/table-cell-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Expense {
  _id: string;
  expenseType: 'Core' | 'Overhead';
  clientId?: string;
  projectId?: string;
  paymentMethod?: ExpensePaymentMethod;
  expensePurpose?: ExpensePurpose;
  filingPeriod?: ExpenseFilingPeriod;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  receiptUrl?: string;
  lockedAt?: string;
}

const statusLabel: Record<Expense['status'], string> = {
  Pending: '대기',
  Approved: '승인',
  Rejected: '반려',
};

const expenseTypeLabel: Record<Expense['expenseType'], string> = {
  Core: '프로젝트',
  Overhead: '간접',
};

function formatExpenseAmount(amount: number, currency: ExpenseCurrency) {
  return formatMoney(amount, currency);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function expenseClassificationLabel(expense: Expense) {
  const parts: string[] = [];
  if (expense.paymentMethod) {
    parts.push(getExpensePaymentMethodLabel(expense.paymentMethod));
  }
  if (expense.expensePurpose) {
    parts.push(getExpensePurposeLabel(expense.expensePurpose));
  }
  if (expense.filingPeriod) {
    parts.push(getExpenseFilingPeriodLabel(expense.filingPeriod));
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export default function ExpensesPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewRejectExpense, setViewRejectExpense] = useState<Expense | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<ExpenseFormInitialValues | null>(null);
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | null>(null);

  const clientMap = Object.fromEntries(clients.map((c) => [c.value, c]));
  const projectMap = Object.fromEntries(projects.map((p) => [p.value, p]));

  const loadData = useCallback(async () => {
    const [clientsRes, projectsRes, expensesRes] = await Promise.all([
      fetch('/api/clients/options'),
      fetch('/api/projects/options'),
      fetch('/api/expenses'),
    ]);

    if (clientsRes.ok) {
      setClients(await clientsRes.json());
    }
    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (expensesRes.ok) {
      setExpenses(await expensesRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadData();
    }
    void init();
  }, [loadData]);

  async function handleSubmit(values: ExpenseFormValues) {
    setSubmitting(true);
    setError('');

    const body: Record<string, unknown> = {
      expenseType: values.expenseType,
      paymentMethod: values.paymentMethod,
      expensePurpose: values.expensePurpose,
      filingPeriod: values.filingPeriod ?? null,
      amount: values.amount,
      currency: values.currency,
      date: values.date,
      description: values.description,
      notes: values.notes ?? null,
    };

    if (values.expenseType === 'Core') {
      body.clientId = values.clientId;
      body.projectId = values.projectId;
    }

    const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    const saved = await res.json();
    const expenseId = editingId ?? saved._id;

    if (values.receiptFile) {
      const formData = new FormData();
      formData.append('file', values.receiptFile);
      formData.append('expenseType', values.expenseType);
      if (values.expenseType === 'Core' && values.clientId) {
        formData.append('clientId', values.clientId);
      }
      formData.append('expenseId', expenseId);

      const uploadRes = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        setSubmitting(false);
        const data = await uploadRes.json();
        setError(
          data.error
            ? `${data.error} (경비 항목은 ${editingId ? '수정' : '등록'}되었습니다. 영수증을 다시 첨부해 주세요.)`
            : `영수증 업로드에 실패했습니다. 경비 항목은 ${editingId ? '수정' : '등록'}되었으니 영수증을 다시 첨부해 주세요.`,
        );
        cancelEdit();
        await loadData();
        return;
      }
    }

    setSubmitting(false);
    cancelEdit();
    await loadData();
  }

  function startEdit(expense: Expense) {
    setEditingId(expense._id);
    setEditInitial({
      expenseType: expense.expenseType,
      clientId: expense.clientId,
      projectId: expense.projectId,
      paymentMethod: expense.paymentMethod ?? 'BizCreditCardRegistered',
      expensePurpose: expense.expensePurpose ?? 'OfficeSupplies',
      filingPeriod: expense.filingPeriod,
      amount: expense.amount,
      currency: expense.currency ?? 'KRW',
      date: toDateInputValue(expense.date),
      description: expense.description,
      notes: expense.notes,
    });
    setEditReceiptUrl(expense.receiptUrl ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditInitial(null);
    setEditReceiptUrl(null);
  }

  function projectLabel(expense: Expense) {
    if (expense.expenseType === 'Overhead') {
      return '—';
    }
    const project = expense.projectId ? projectMap[expense.projectId] : undefined;
    const client = expense.clientId ? clientMap[expense.clientId] : undefined;
    if (project && client) {
      return `${client.label} — ${project.label}`;
    }
    return expense.projectId ?? '—';
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">경비 관리</h1>
        <p className="mt-1 text-muted-foreground">
          프로젝트 및 간접 경비를 등록하고 내역을 확인합니다.
        </p>
      </div>

      <SimpleModal
        open={!!viewRejectExpense}
        title="반려 사유"
        description={
          viewRejectExpense
            ? `${formatDate(viewRejectExpense.date)} · ${viewRejectExpense.description}`
            : undefined
        }
        onClose={() => setViewRejectExpense(null)}
        footer={
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
            onClick={() => setViewRejectExpense(null)}
          >
            닫기
          </button>
        }
      >
        <p className="whitespace-pre-wrap text-sm">
          {viewRejectExpense?.rejectionReason?.trim() ||
            '등록된 반려 사유가 없습니다.'}
        </p>
      </SimpleModal>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '경비 수정' : '경비 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            key={editingId ?? 'new'}
            clients={clients}
            projects={projects}
            editingId={editingId}
            initialValues={editInitial}
            existingReceiptUrl={editReceiptUrl}
            onCancelEdit={cancelEdit}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 경비</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground">등록된 경비가 없습니다.</p>
          ) : (
            <ResponsiveDataView
              mobile={
                <div className="flex flex-col gap-3">
                  {expenses.map((expense) => (
                    <DataRecordCard
                      key={expense._id}
                      className={lockedEntryClass(expense.lockedAt)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{formatDate(expense.date)}</p>
                        <div className="flex items-center gap-1">
                          {canPreparerEditEntry(expense) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(expense)}
                            >
                              수정
                            </Button>
                          )}
                          {expense.status === 'Rejected' ? (
                          <button
                            type="button"
                            className="inline-flex cursor-pointer"
                            onClick={() => setViewRejectExpense(expense)}
                            title="반려 사유 보기"
                          >
                            <Badge variant="secondary">{statusLabel[expense.status]}</Badge>
                          </button>
                        ) : (
                          <Badge
                            variant={expense.status === 'Approved' ? 'default' : 'secondary'}
                          >
                            {statusLabel[expense.status]}
                          </Badge>
                        )}
                        </div>
                      </div>
                      <DataRecordRow label="유형">
                        {expenseTypeLabel[expense.expenseType]}
                      </DataRecordRow>
                      <DataRecordRow label="지출 분류">
                        {expenseClassificationLabel(expense)}
                      </DataRecordRow>
                      <DataRecordRow label="프로젝트">{projectLabel(expense)}</DataRecordRow>
                      <DataRecordRow label="금액">
                        {formatExpenseAmount(expense.amount, expense.currency ?? 'KRW')}
                      </DataRecordRow>
                      <DataRecordRow label="설명">{expense.description}</DataRecordRow>
                      {expense.notes ? (
                        <DataRecordRow label="비고">{expense.notes}</DataRecordRow>
                      ) : null}
                      {expense.receiptUrl ? (
                        <DataRecordRow label="영수증">
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            보기
                          </a>
                        </DataRecordRow>
                      ) : null}
                    </DataRecordCard>
                  ))}
                </div>
              }
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>지출일</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>지출 분류</TableHead>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead>영수증</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[4.5rem]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow
                        key={expense._id}
                        className={lockedEntryClass(expense.lockedAt)}
                        title={lockedEntryTitle(expense.lockedAt)}
                      >
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expenseTypeLabel[expense.expenseType]}</TableCell>
                        <TableCell className={tableWrapCellSm}>
                          {expenseClassificationLabel(expense)}
                        </TableCell>
                        <TableCell className={tableWrapCellSm}>{projectLabel(expense)}</TableCell>
                        <TableCell>
                          {formatExpenseAmount(expense.amount, expense.currency ?? 'KRW')}
                        </TableCell>
                        <TableCell className={tableWrapCell}>
                          {expense.description}
                        </TableCell>
                        <TableCell>
                          {expense.receiptUrl ? (
                            <a
                              href={expense.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              보기
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.status === 'Rejected' ? (
                            <button
                              type="button"
                              className="inline-flex cursor-pointer"
                              onClick={() => setViewRejectExpense(expense)}
                              title="반려 사유 보기"
                            >
                              <Badge variant="secondary">
                                {statusLabel[expense.status]}
                              </Badge>
                            </button>
                          ) : (
                            <Badge
                              variant={expense.status === 'Approved' ? 'default' : 'secondary'}
                            >
                              {statusLabel[expense.status]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canPreparerEditEntry(expense) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(expense)}
                            >
                              수정
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
