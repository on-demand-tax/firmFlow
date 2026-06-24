'use client';

import { useCallback, useEffect, useState } from 'react';

import { SimpleModal } from '@/components/app/SimpleModal';
import {
  DataRecordActions,
  DataRecordCard,
  DataRecordRow,
} from '@/components/app/DataRecordCard';
import { ResponsiveDataView } from '@/components/app/ResponsiveDataView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney, type ExpenseCurrency } from '@/lib/currency';
import { getExpenseFilingPeriodLabel, type ExpenseFilingPeriod } from '@/lib/expense-filing-periods';
import {
  getExpensePaymentMethodLabel,
  type ExpensePaymentMethod,
} from '@/lib/expense-payment-methods';
import { getExpensePurposeLabel, type ExpensePurpose } from '@/lib/expense-purposes';
import { resolveAuthorLabel } from '@/lib/author-display';

interface TimeLog {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  clientId: string;
  projectId: string;
  date: string;
  hours: number;
  activity?: string;
  activityLabel?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface Expense {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
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
  receiptUrl?: string;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
}

interface ClientOption {
  value: string;
  label: string;
}

type RejectTarget = {
  kind: 'timelog' | 'expense';
  id: string;
  summary: string;
};

const expenseTypeLabel: Record<Expense['expenseType'], string> = {
  Core: '프로젝트',
  Overhead: '간접',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function formatExpenseAmount(amount: number, currency: ExpenseCurrency) {
  return formatMoney(amount, currency);
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

function authorLabel(
  item: { userName?: string; userEmail?: string; userId: string },
  userById: Record<string, UserOption>,
) {
  return resolveAuthorLabel(item, userById);
}

export default function ApprovalsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const projectMap = Object.fromEntries(projects.map((p) => [p.value, p]));
  const clientMap = Object.fromEntries(clients.map((c) => [c.value, c]));
  const userMap = Object.fromEntries(users.map((user) => [user._id, user]));

  const loadData = useCallback(async () => {
    const [projectsRes, clientsRes, usersRes, logsRes, expensesRes] = await Promise.all([
      fetch('/api/projects/options'),
      fetch('/api/clients/options'),
      fetch('/api/users'),
      fetch('/api/timelogs'),
      fetch('/api/expenses'),
    ]);

    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (clientsRes.ok) {
      setClients(await clientsRes.json());
    }
    if (usersRes.ok) {
      setUsers(await usersRes.json());
    }
    if (logsRes.ok) {
      const all: TimeLog[] = await logsRes.json();
      setLogs(all.filter((log) => log.status === 'Pending'));
    }
    if (expensesRes.ok) {
      const all: Expense[] = await expensesRes.json();
      setExpenses(all.filter((expense) => expense.status === 'Pending'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadData();
    }
    void init();
  }, [loadData]);

  async function handleTimeLogStatus(
    id: string,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
  ): Promise<boolean> {
    setActingId(`timelog:${id}`);
    setError('');

    const res = await fetch(`/api/timelogs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });

    setActingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '처리에 실패했습니다');
      return false;
    }

    await loadData();
    return true;
  }

  async function handleExpenseStatus(
    id: string,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
  ): Promise<boolean> {
    setActingId(`expense:${id}`);
    setError('');

    const res = await fetch(`/api/expenses/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });

    setActingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '처리에 실패했습니다');
      return false;
    }

    await loadData();
    return true;
  }

  function openReject(target: RejectTarget) {
    setRejectTarget(target);
    setRejectReason('');
    setError('');
  }

  function cancelReject() {
    setRejectTarget(null);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setError('반려 사유를 입력해 주세요');
      return;
    }

    const ok =
      rejectTarget.kind === 'timelog'
        ? await handleTimeLogStatus(rejectTarget.id, 'Rejected', rejectReason.trim())
        : await handleExpenseStatus(rejectTarget.id, 'Rejected', rejectReason.trim());

    if (ok) {
      cancelReject();
    }
  }

  function expenseProjectLabel(expense: Expense) {
    if (expense.expenseType === 'Overhead') {
      return '—';
    }
    const project = expense.projectId ? projectMap[expense.projectId] : undefined;
    const client = expense.clientId ? clientMap[expense.clientId] : undefined;
    if (project && client) {
      return `${client.label} — ${project.label}`;
    }
    if (project) {
      return `${project.clientName} — ${project.label}`;
    }
    return expense.projectId ?? '—';
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">승인 대기</h1>
        <p className="mt-1 text-muted-foreground">
          대기 중인 타임로그와 경비를 검토하고 승인합니다.
        </p>
      </div>

      {error && !rejectTarget && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <SimpleModal
        open={!!rejectTarget}
        title="반려 사유 입력"
        description={rejectTarget?.summary}
        onClose={cancelReject}
        footer={
          <>
            <Button variant="outline" disabled={!!actingId} onClick={cancelReject}>
              취소
            </Button>
            <Button disabled={!!actingId} onClick={() => void confirmReject()}>
              반려 확정
            </Button>
          </>
        }
      >
        {error && rejectTarget && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="rejectReason">반려 사유</Label>
          <textarea
            id="rejectReason"
            className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유를 입력하세요"
            autoFocus
          />
        </div>
      </SimpleModal>

      <Card>
        <CardHeader>
          <CardTitle>타임로그</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">승인 대기 중인 타임로그가 없습니다.</p>
          ) : (
            <ResponsiveDataView
              mobile={
                <div className="flex flex-col gap-3">
                  {logs.map((log) => {
                    const project = projectMap[log.projectId];
                    const busy = actingId === `timelog:${log._id}`;
                    const summary = `타임로그 · ${authorLabel(log, userMap)} · ${formatDate(log.date)}`;
                    return (
                      <DataRecordCard key={log._id}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{formatDate(log.date)}</p>
                          <Badge variant="secondary">대기</Badge>
                        </div>
                        <DataRecordRow label="작성자">{authorLabel(log, userMap)}</DataRecordRow>
                        <DataRecordRow label="프로젝트">
                          {project ? `${project.clientName} — ${project.label}` : log.projectId}
                        </DataRecordRow>
                        <DataRecordRow label="시간">{log.hours}h</DataRecordRow>
                        <DataRecordRow label="내용">
                          <span className="block text-right">
                            {log.activityLabel && (
                              <span className="block font-medium">{log.activityLabel}</span>
                            )}
                            {log.description}
                          </span>
                        </DataRecordRow>
                        <DataRecordActions>
                          <Button
                            size="sm"
                            disabled={busy || !!rejectTarget}
                            onClick={() => void handleTimeLogStatus(log._id, 'Approved')}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || !!rejectTarget}
                            onClick={() => openReject({ kind: 'timelog', id: log._id, summary })}
                          >
                            반려
                          </Button>
                        </DataRecordActions>
                      </DataRecordCard>
                    );
                  })}
                </div>
              }
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>작업일</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>시간</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const project = projectMap[log.projectId];
                      const busy = actingId === `timelog:${log._id}`;
                      const summary = `타임로그 · ${authorLabel(log, userMap)} · ${formatDate(log.date)}`;
                      return (
                        <TableRow key={log._id}>
                          <TableCell>{formatDate(log.date)}</TableCell>
                          <TableCell>{authorLabel(log, userMap)}</TableCell>
                          <TableCell>
                            {project ? `${project.clientName} — ${project.label}` : log.projectId}
                          </TableCell>
                          <TableCell>{log.hours}h</TableCell>
                          <TableCell>
                            {log.activityLabel && (
                              <p className="text-sm font-medium">{log.activityLabel}</p>
                            )}
                            <p className="text-sm">{log.description}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">대기</Badge>
                          </TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button
                              size="sm"
                              disabled={busy || !!rejectTarget}
                              onClick={() => void handleTimeLogStatus(log._id, 'Approved')}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || !!rejectTarget}
                              onClick={() => openReject({ kind: 'timelog', id: log._id, summary })}
                            >
                              반려
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>경비</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground">승인 대기 중인 경비가 없습니다.</p>
          ) : (
            <ResponsiveDataView
              mobile={
                <div className="flex flex-col gap-3">
                  {expenses.map((expense) => {
                    const busy = actingId === `expense:${expense._id}`;
                    const summary = `경비 · ${authorLabel(expense, userMap)} · ${formatDate(expense.date)}`;
                    return (
                      <DataRecordCard key={expense._id}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{formatDate(expense.date)}</p>
                          <Badge variant="secondary">대기</Badge>
                        </div>
                        <DataRecordRow label="작성자">{authorLabel(expense, userMap)}</DataRecordRow>
                        <DataRecordRow label="유형">
                          {expenseTypeLabel[expense.expenseType]}
                        </DataRecordRow>
                        <DataRecordRow label="지출 분류">
                          {expenseClassificationLabel(expense)}
                        </DataRecordRow>
                        <DataRecordRow label="프로젝트">
                          {expenseProjectLabel(expense)}
                        </DataRecordRow>
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
                        <DataRecordActions>
                          <Button
                            size="sm"
                            disabled={busy || !!rejectTarget}
                            onClick={() => void handleExpenseStatus(expense._id, 'Approved')}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || !!rejectTarget}
                            onClick={() =>
                              openReject({ kind: 'expense', id: expense._id, summary })
                            }
                          >
                            반려
                          </Button>
                        </DataRecordActions>
                      </DataRecordCard>
                    );
                  })}
                </div>
              }
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>지출일</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>지출 분류</TableHead>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead>영수증</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => {
                      const busy = actingId === `expense:${expense._id}`;
                      const summary = `경비 · ${authorLabel(expense, userMap)} · ${formatDate(expense.date)}`;
                      return (
                        <TableRow key={expense._id}>
                          <TableCell>{formatDate(expense.date)}</TableCell>
                          <TableCell>{authorLabel(expense, userMap)}</TableCell>
                          <TableCell>{expenseTypeLabel[expense.expenseType]}</TableCell>
                          <TableCell className="max-w-[14rem] text-sm">
                            {expenseClassificationLabel(expense)}
                          </TableCell>
                          <TableCell>{expenseProjectLabel(expense)}</TableCell>
                          <TableCell>
                            {formatExpenseAmount(expense.amount, expense.currency ?? 'KRW')}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
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
                            <Badge variant="secondary">대기</Badge>
                          </TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button
                              size="sm"
                              disabled={busy || !!rejectTarget}
                              onClick={() => void handleExpenseStatus(expense._id, 'Approved')}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || !!rejectTarget}
                              onClick={() =>
                                openReject({ kind: 'expense', id: expense._id, summary })
                              }
                            >
                              반려
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
