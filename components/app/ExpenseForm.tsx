'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReceiptAttachment } from '@/components/app/ReceiptAttachment';
import { EXPENSE_CURRENCIES, formatAmountInput, parseAmountInput, type ExpenseCurrency } from '@/lib/currency';
import { EXPENSE_FILING_PERIODS } from '@/lib/expense-filing-periods';
import {
  EXPENSE_PAYMENT_METHOD_GROUPS,
  formatPaymentMethodOptionLabel,
  isNonVoucherPaymentMethod,
  type ExpensePaymentMethod,
} from '@/lib/expense-payment-methods';
import {
  EXPENSE_PURPOSE_GROUPS,
  formatPurposeOptionLabel,
  type ExpensePurpose,
} from '@/lib/expense-purposes';
import type { ExpenseFilingPeriod } from '@/lib/expense-filing-periods';

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
  paymentMethod: ExpensePaymentMethod;
  expensePurpose: ExpensePurpose;
  filingPeriod?: ExpenseFilingPeriod;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  notes?: string;
  receiptFile?: File | null;
}

export function validateExpenseForm(values: ExpenseFormValues): string | null {
  if (!values.date || !values.description.trim()) {
    return '필수 항목을 입력해 주세요';
  }
  if (!values.paymentMethod) {
    return '지출 방법을 선택해 주세요';
  }
  if (!values.expensePurpose) {
    return '지출 용도를 선택해 주세요';
  }
  if (values.amount < 0 || Number.isNaN(values.amount)) {
    return '금액은 0 이상이어야 합니다';
  }
  if (values.expenseType === 'Core' && (!values.clientId || !values.projectId)) {
    return '프로젝트 경비는 고객과 프로젝트를 선택해 주세요';
  }
  return null;
}

export interface ExpenseFormInitialValues {
  expenseType: 'Core' | 'Overhead';
  clientId?: string;
  projectId?: string;
  paymentMethod: ExpensePaymentMethod;
  expensePurpose: ExpensePurpose;
  filingPeriod?: ExpenseFilingPeriod;
  amount: number;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  notes?: string;
}

interface ExpenseFormProps {
  clients: ClientOption[];
  projects: ProjectOption[];
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  submitting?: boolean;
  editingId?: string | null;
  initialValues?: ExpenseFormInitialValues | null;
  existingReceiptUrl?: string | null;
  onCancelEdit?: () => void;
}

const emptyForm: {
  expenseType: 'Core' | 'Overhead';
  clientId: string;
  projectId: string;
  paymentMethod: string;
  expensePurpose: string;
  filingPeriod: string;
  amount: string;
  currency: ExpenseCurrency;
  date: string;
  description: string;
  notes: string;
  receiptFile: File | null;
} = {
  expenseType: 'Core',
  clientId: '',
  projectId: '',
  paymentMethod: '',
  expensePurpose: '',
  filingPeriod: '',
  amount: '',
  currency: 'KRW',
  date: '',
  description: '',
  notes: '',
  receiptFile: null,
};

function buildFormState(initialValues?: ExpenseFormInitialValues | null) {
  if (!initialValues) return emptyForm;
  return {
    expenseType: initialValues.expenseType,
    clientId: initialValues.clientId ?? '',
    projectId: initialValues.projectId ?? '',
    paymentMethod: initialValues.paymentMethod,
    expensePurpose: initialValues.expensePurpose,
    filingPeriod: initialValues.filingPeriod ?? '',
    amount: formatAmountInput(String(initialValues.amount), initialValues.currency),
    currency: initialValues.currency,
    date: initialValues.date,
    description: initialValues.description,
    notes: initialValues.notes ?? '',
    receiptFile: null,
  };
}

export function ExpenseForm({
  clients,
  projects,
  onSubmit,
  submitting = false,
  editingId = null,
  initialValues = null,
  existingReceiptUrl = null,
  onCancelEdit,
}: ExpenseFormProps) {
  const [form, setForm] = useState(() => buildFormState(initialValues));
  const [error, setError] = useState('');

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.clientId === form.clientId),
    [projects, form.clientId],
  );

  const showAttributionHint =
    form.paymentMethod !== '' &&
    isNonVoucherPaymentMethod(form.paymentMethod as ExpensePaymentMethod);

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
      paymentMethod: form.paymentMethod as ExpensePaymentMethod,
      expensePurpose: form.expensePurpose as ExpensePurpose,
      filingPeriod: form.filingPeriod
        ? (form.filingPeriod as ExpenseFilingPeriod)
        : undefined,
      amount,
      currency: form.currency,
      date: form.date,
      description: form.description,
      notes: form.notes.trim() || undefined,
      receiptFile: form.receiptFile,
    };

    const validationError = validateExpenseForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    await onSubmit(values);
    if (!editingId) {
      setForm(emptyForm);
    }
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
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="paymentMethod">지출 방법</Label>
        <select
          id="paymentMethod"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.paymentMethod}
          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          required
        >
          <option value="">선택</option>
          {EXPENSE_PAYMENT_METHOD_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {formatPaymentMethodOptionLabel(method)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          지출 수단은 부가세 공제 여부 판단 및 증빙 매칭의 기준이 됩니다.
        </p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="expensePurpose">지출 용도</Label>
        <select
          id="expensePurpose"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.expensePurpose}
          onChange={(e) => setForm({ ...form, expensePurpose: e.target.value })}
          required
        >
          <option value="">선택</option>
          {EXPENSE_PURPOSE_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {formatPurposeOptionLabel(purpose)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="filingPeriod">관련 신고 기간 (선택)</Label>
        <select
          id="filingPeriod"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.filingPeriod}
          onChange={(e) => setForm({ ...form, filingPeriod: e.target.value })}
        >
          <option value="">해당 없음</option>
          {EXPENSE_FILING_PERIODS.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          신고 기간(법인세·종소세·부가세 등)에 집중되는 지출은 태그를 선택하면 시즌별 원가 분석에
          도움이 됩니다.
        </p>
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
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">비고 (선택)</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={
            showAttributionHint
              ? '예: 수임업체명: (주)○○ / 목적: 대표자 자녀 결혼'
              : '수임업체명·지출 목적 등 추가 소명 정보'
          }
        />
        {showAttributionHint && (
          <p className="text-xs text-muted-foreground">
            비증빙 지출은 수임업체명과 목적을 비고에 기재해 주세요. 소득세 비용 소명에 유리합니다.
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <ReceiptAttachment
          value={form.receiptFile}
          onChange={(receiptFile) => setForm({ ...form, receiptFile })}
          disabled={submitting}
        />
        {editingId && existingReceiptUrl && !form.receiptFile && (
          <p className="mt-2 text-sm text-muted-foreground">
            등록된 영수증:{' '}
            <a
              href={existingReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              보기
            </a>
            {' '}(새 파일을 선택하면 교체됩니다)
          </p>
        )}
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? '저장 중...' : editingId ? '수정' : '등록'}
        </Button>
        {editingId && onCancelEdit && (
          <Button type="button" variant="outline" disabled={submitting} onClick={onCancelEdit}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
