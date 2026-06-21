'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  ExpenseForm,
  type ClientOption,
  type ExpenseFormValues,
  type ProjectOption,
} from '@/components/app/ExpenseForm';
import { Badge } from '@/components/ui/badge';
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
  amount: number;
  date: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(
    amount,
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export default function ExpensesPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    void loadData();
  }, [loadData]);

  async function handleSubmit(values: ExpenseFormValues) {
    setSubmitting(true);
    setError('');

    const body: Record<string, unknown> = {
      expenseType: values.expenseType,
      amount: values.amount,
      date: values.date,
      description: values.description,
    };

    if (values.expenseType === 'Core') {
      body.clientId = values.clientId;
      body.projectId = values.projectId;
    }

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    const created = await res.json();

    if (values.receiptFile) {
      const formData = new FormData();
      formData.append('file', values.receiptFile);
      formData.append('expenseType', values.expenseType);
      if (values.expenseType === 'Core' && values.clientId) {
        formData.append('clientId', values.clientId);
      }
      formData.append('expenseId', created._id);

      const uploadRes = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        setSubmitting(false);
        const data = await uploadRes.json();
        setError(data.error ?? '영수증 업로드에 실패했습니다');
        await loadData();
        return;
      }
    }

    setSubmitting(false);
    await loadData();
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

      <Card>
        <CardHeader>
          <CardTitle>경비 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            clients={clients}
            projects={projects}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지출일</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>영수증</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expenseTypeLabel[expense.expenseType]}</TableCell>
                    <TableCell>{projectLabel(expense)}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
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
                      <Badge
                        variant={expense.status === 'Approved' ? 'default' : 'secondary'}
                      >
                        {statusLabel[expense.status]}
                        {expense.lockedAt ? ' (마감)' : ''}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
