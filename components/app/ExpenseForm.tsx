'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReceiptAttachment } from '@/components/app/ReceiptAttachment';
import { EXPENSE_CURRENCIES, formatAmountInput, parseAmountInput, type ExpenseCurrency } from '@/lib/currency';

export interface ClientOption {
  value: string;
  label: string;
  clientCode: string;
}

export interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
}

export interface ExpenseFormValues {
  expenseType: 'Core' | 'Overhead';
  clientId?: string;
  projectId?: string;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  receiptFile?: File | null;
}

export function validateExpenseForm(values: ExpenseFormValues): string | null {
  if (!values.date || !values.description.trim()) {
    return '필수 항목을 입력해 주세요';
  }
  if (values.amount < 0 || Number.isNaN(values.amount)) {
    return '금액은 0 이상이어야 합니다';
  }
  if (values.expenseType === 'Core' && (!values.clientId || !values.projectId)) {
    return '프로젝트 경비는 고객과 프로젝트를 선택해 주세요';
  }
  return null;
}

interface ExpenseFormProps {
  clients: ClientOption[];
  projects: ProjectOption[];
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  submitting?: boolean;
}

const emptyForm: {
  expenseType: 'Core' | 'Overhead';
  clientId: string;
  projectId: string;
  amount: string;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  receiptFile: File | null;
} = {
  expenseType: 'Core',
  clientId: '',
  projectId: '',
  amount: '',
  currency: 'KRW',
  date: '',
  description: '',
  receiptFile: null,
};

export function ExpenseForm({
  clients,
  projects,
  onSubmit,
  submitting = false,
}: ExpenseFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.clientId === form.clientId),
    [projects, form.clientId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amount = parseAmountInput(form.amount);
    if (amount === undefined) {
      setError('필수 항목을 입력해 주세요');
      return;
    }

    const values: ExpenseFormValues = {
      expenseType: form.expenseType,
      clientId: form.expenseType === 'Core' ? form.clientId : undefined,
      projectId: form.expenseType === 'Core' ? form.projectId : undefined,
      amount,
      currency: form.currency,
      date: form.date,
      description: form.description,
      receiptFile: form.receiptFile,
    };

    const validationError = validateExpenseForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    await onSubmit(values);
    setForm(emptyForm);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="expenseType">경비 유형</Label>
        <select
          id="expenseType"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.expenseType}
          onChange={(e) =>
            setForm({
              ...form,
              expenseType: e.target.value as 'Core' | 'Overhead',
              clientId: '',
              projectId: '',
            })
          }
        >
          <option value="Core">프로젝트 경비</option>
          <option value="Overhead">간접 경비</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">지출일</Label>
        <Input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </div>
      {form.expenseType === 'Core' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="client">고객</Label>
            <select
              id="client"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.clientId}
              onChange={(e) =>
                setForm({ ...form, clientId: e.target.value, projectId: '' })
              }
              required
            >
              <option value="">선택</option>
              {clients.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">프로젝트</Label>
            <select
              id="project"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              required
              disabled={!form.clientId}
            >
              <option value="">선택</option>
              {filteredProjects.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="currency">통화</Label>
        <select
          id="currency"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.currency}
          onChange={(e) => {
            const currency = e.target.value as ExpenseCurrency;
            setForm((prev) => ({
              ...prev,
              currency,
              amount: prev.amount
                ? formatAmountInput(prev.amount.replace(/,/g, ''), currency)
                : '',
            }));
          }}
        >
          {EXPENSE_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">금액</Label>
        <Input
          id="amount"
          type="text"
          inputMode={form.currency === 'USD' ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={form.amount}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              amount: formatAmountInput(e.target.value, prev.currency),
            }))
          }
          placeholder={form.currency === 'USD' ? '0.00' : '0'}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">설명</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <ReceiptAttachment
          value={form.receiptFile}
          onChange={(receiptFile) => setForm({ ...form, receiptFile })}
          disabled={submitting}
        />
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? '저장 중...' : '등록'}
        </Button>
      </div>
    </form>
  );
}
