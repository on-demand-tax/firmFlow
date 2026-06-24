'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DataRecordActions,
  DataRecordCard,
  DataRecordRow,
} from '@/components/app/DataRecordCard';
import { ResponsiveDataView } from '@/components/app/ResponsiveDataView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatAmountFromNumber,
  formatAmountInput,
  formatMoney,
  parseAmountInput,
} from '@/lib/currency';
import {
  buildProjectNameTemplate,
  type ProjectType,
  type BillingModel,
  type BillingCycle,
  type WorkSubtype,
} from '@/lib/project-types';

interface ClientOption {
  value: string;
  label: string;
}

interface WorkSubtypeMeta {
  id: WorkSubtype;
  label: string;
  defaultBillingModel?: BillingModel;
}

interface ProjectTypeMeta {
  id: ProjectType;
  label: string;
  defaultBillingModel: BillingModel;
  defaultBillingCycle: BillingCycle | null;
  requiredFields: string[];
  requiresWorkSubtype: boolean;
  subtypes: WorkSubtypeMeta[];
}

interface BillingModelMeta {
  id: BillingModel;
  label: string;
}

interface Project {
  _id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  projectName: string;
  projectType: ProjectType;
  projectTypeLabel: string;
  workSubtype?: WorkSubtype;
  workSubtypeLabel?: string;
  billingModel: BillingModel;
  billingModelLabel: string;
  status: 'Active' | 'Completed';
  currency: 'KRW' | 'USD';
  contractAmount?: number;
  baseFeeAmount?: number;
  successFeeRate?: number;
  hourlyRate?: number;
  billingAnchorDay?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  eventDate?: string;
  notes?: string;
  billingCycle?: string;
}

interface ProjectForm {
  clientId: string;
  projectType: ProjectType;
  billingModel: BillingModel;
  projectName: string;
  status: 'Active' | 'Completed';
  currency: 'KRW' | 'USD';
  billingCycle: string;
  contractAmount: string;
  baseFeeAmount: string;
  successFeeRate: string;
  hourlyRate: string;
  billingAnchorDay: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  eventDate: string;
  workSubtype: string;
  notes: string;
}

const emptyForm: ProjectForm = {
  clientId: '',
  projectType: 'BookkeepingAgency',
  billingModel: 'Retainer',
  projectName: '',
  status: 'Active',
  currency: 'KRW',
  billingCycle: 'Monthly',
  contractAmount: '',
  baseFeeAmount: '',
  successFeeRate: '',
  hourlyRate: '',
  billingAnchorDay: '1',
  fiscalYearStart: '',
  fiscalYearEnd: '',
  eventDate: '',
  workSubtype: '',
  notes: '',
};

const BILLING_CYCLE_OPTIONS = [
  { value: 'Monthly', label: '월간' },
  { value: 'Quarterly', label: '분기' },
  { value: 'SemiAnnual', label: '반기' },
  { value: 'Annual', label: '연간' },
  { value: 'OnCompletion', label: '완료 시' },
];

function defaultFiscalYear(): number {
  return new Date().getFullYear() - 1;
}

function fiscalYearDefaults(year = defaultFiscalYear()) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    startPlaceholder: `01/01/${year}`,
    endPlaceholder: `12/31/${year}`,
  };
}

type MoneyFormField = 'contractAmount' | 'baseFeeAmount' | 'hourlyRate';

function buildSuggestedName(form: ProjectForm): string {
  return buildProjectNameTemplate(form.projectType, {
    workSubtype: form.workSubtype ? (form.workSubtype as WorkSubtype) : undefined,
    fiscalYearStart: form.fiscalYearStart || undefined,
    fiscalYearEnd: form.fiscalYearEnd || undefined,
    eventDate: form.eventDate || undefined,
  });
}

function formToPayload(form: ProjectForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    clientId: form.clientId,
    projectName: form.projectName,
    projectType: form.projectType,
    billingModel: form.billingModel,
    status: form.status,
    currency: form.currency,
  };

  if (form.billingCycle) payload.billingCycle = form.billingCycle;
  const contractAmount = parseAmountInput(form.contractAmount);
  if (contractAmount !== undefined) payload.contractAmount = contractAmount;
  const baseFeeAmount = parseAmountInput(form.baseFeeAmount);
  if (baseFeeAmount !== undefined) payload.baseFeeAmount = baseFeeAmount;
  if (form.successFeeRate) payload.successFeeRate = Number(form.successFeeRate);
  const hourlyRate = parseAmountInput(form.hourlyRate);
  if (hourlyRate !== undefined) payload.hourlyRate = hourlyRate;
  if (form.billingAnchorDay) payload.billingAnchorDay = Number(form.billingAnchorDay);
  if (form.fiscalYearStart) payload.fiscalYearStart = form.fiscalYearStart;
  if (form.fiscalYearEnd) payload.fiscalYearEnd = form.fiscalYearEnd;
  if (form.eventDate) payload.eventDate = form.eventDate;
  if (form.workSubtype) payload.workSubtype = form.workSubtype;
  if (form.notes) payload.notes = form.notes;

  return payload;
}

function projectToForm(project: Project): ProjectForm {
  const currency = (project.currency ?? 'KRW') as 'KRW' | 'USD';
  return {
    clientId: project.clientId,
    projectType: project.projectType,
    billingModel: project.billingModel,
    projectName: project.projectName,
    status: project.status,
    currency,
    billingCycle: String(project.billingCycle ?? ''),
    contractAmount:
      project.contractAmount !== undefined
        ? formatAmountFromNumber(project.contractAmount, currency)
        : '',
    baseFeeAmount:
      project.baseFeeAmount !== undefined
        ? formatAmountFromNumber(project.baseFeeAmount, currency)
        : '',
    successFeeRate:
      project.successFeeRate !== undefined ? String(project.successFeeRate) : '',
    hourlyRate:
      project.hourlyRate !== undefined
        ? formatAmountFromNumber(project.hourlyRate, currency)
        : '',
    billingAnchorDay:
      project.billingAnchorDay !== undefined ? String(project.billingAnchorDay) : '1',
    fiscalYearStart: project.fiscalYearStart
      ? String(project.fiscalYearStart).slice(0, 10)
      : '',
    fiscalYearEnd: project.fiscalYearEnd
      ? String(project.fiscalYearEnd).slice(0, 10)
      : '',
    eventDate: project.eventDate ? String(project.eventDate).slice(0, 10) : '',
    workSubtype: String(project.workSubtype ?? ''),
    notes: String(project.notes ?? ''),
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [typeMetas, setTypeMetas] = useState<ProjectTypeMeta[]>([]);
  const [billingMetas, setBillingMetas] = useState<BillingModelMeta[]>([]);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedTypeMeta = useMemo(
    () => typeMetas.find((t) => t.id === form.projectType),
    [typeMetas, form.projectType],
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterType !== 'all' && p.projectType !== filterType) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, filterType, filterStatus]);

  const loadData = useCallback(async () => {
    const [projectsRes, clientsRes, typesRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/clients/options'),
      fetch('/api/project-types'),
    ]);
    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (clientsRes.ok) {
      setClients(await clientsRes.json());
    }
    if (typesRes.ok) {
      const data = await typesRes.json();
      setTypeMetas(data.types);
      setBillingMetas(data.billingModels);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedTypeMeta?.requiredFields.includes('fiscalYearStart')) return;
    const fiscal = fiscalYearDefaults();
    setForm((prev) => {
      if (prev.fiscalYearStart && prev.fiscalYearEnd) return prev;
      return {
        ...prev,
        fiscalYearStart: prev.fiscalYearStart || fiscal.start,
        fiscalYearEnd: prev.fiscalYearEnd || fiscal.end,
      };
    });
  }, [selectedTypeMeta]);

  useEffect(() => {
    if (nameTouched || editingId) return;
    const suggested = buildSuggestedName(form);
    if (suggested && suggested !== form.projectName) {
      setForm((prev) => ({ ...prev, projectName: suggested }));
    }
  }, [
    form.projectType,
    form.workSubtype,
    form.fiscalYearStart,
    form.fiscalYearEnd,
    form.eventDate,
    nameTouched,
    editingId,
  ]);

  function applyTypeDefaults(projectType: ProjectType) {
    const meta = typeMetas.find((t) => t.id === projectType);
    if (!meta) return;
    const defaultSubtype = meta.requiresWorkSubtype
      ? (meta.subtypes[0]?.id ?? '')
      : '';
    const fiscal = fiscalYearDefaults();
    const needsFiscalYear = meta.requiredFields.includes('fiscalYearStart');
    setForm((prev) => ({
      ...prev,
      projectType,
      billingModel: meta.defaultBillingModel,
      billingCycle: meta.defaultBillingCycle ?? prev.billingCycle,
      workSubtype: defaultSubtype,
      fiscalYearStart: needsFiscalYear
        ? prev.fiscalYearStart || fiscal.start
        : '',
      fiscalYearEnd: needsFiscalYear ? prev.fiscalYearEnd || fiscal.end : '',
    }));
    setNameTouched(false);
  }

  function handleMoneyChange(field: MoneyFormField, raw: string) {
    setForm((prev) => ({
      ...prev,
      [field]: formatAmountInput(raw, prev.currency),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    const url = editingId ? `/api/projects/${editingId}` : '/api/projects';
    const method = editingId ? 'PATCH' : 'POST';
    const body = formToPayload(form);

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.error === 'string' ? data.error : '저장에 실패했습니다',
      );
      return;
    }

    if (data.warning) {
      setNotice(data.warning);
    }

    setForm(emptyForm);
    setEditingId(null);
    setNameTouched(false);
    await loadData();
  }

  async function startEdit(project: Project) {
    const res = await fetch(`/api/projects/${project._id}`);
    if (!res.ok) {
      setError('프로젝트 정보를 불러오지 못했습니다');
      return;
    }
    const detail = await res.json();
    setEditingId(project._id);
    setForm(projectToForm(detail));
    setNameTouched(true);
    setError('');
    setNotice('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setNameTouched(false);
    setError('');
  }

  async function handleDelete(id: string) {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '삭제에 실패했습니다');
      return;
    }
    await loadData();
  }

  function renderDynamicField(field: string) {
    switch (field) {
      case 'billingCycle':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="billingCycle">청구 주기</Label>
            <select
              id="billingCycle"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.billingCycle}
              onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
              required
            >
              {BILLING_CYCLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'currency':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="currency">통화</Label>
            <select
              id="currency"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.currency}
              onChange={(e) => {
                const currency = e.target.value as 'KRW' | 'USD';
                setForm((prev) => ({
                  ...prev,
                  currency,
                  contractAmount: prev.contractAmount
                    ? formatAmountInput(prev.contractAmount.replace(/,/g, ''), currency)
                    : '',
                  baseFeeAmount: prev.baseFeeAmount
                    ? formatAmountInput(prev.baseFeeAmount.replace(/,/g, ''), currency)
                    : '',
                  hourlyRate: prev.hourlyRate
                    ? formatAmountInput(prev.hourlyRate.replace(/,/g, ''), currency)
                    : '',
                }));
              }}
              required
            >
              <option value="KRW">KRW (원)</option>
              <option value="USD">USD (달러)</option>
            </select>
          </div>
        );
      case 'contractAmount':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="contractAmount">계약 금액</Label>
            <Input
              id="contractAmount"
              type="text"
              inputMode={form.currency === 'USD' ? 'decimal' : 'numeric'}
              autoComplete="off"
              value={form.contractAmount}
              onChange={(e) => handleMoneyChange('contractAmount', e.target.value)}
              placeholder={form.currency === 'USD' ? '0.00' : '0'}
              required={selectedTypeMeta?.requiredFields.includes('contractAmount')}
            />
          </div>
        );
      case 'billingAnchorDay':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="billingAnchorDay">청구 기준일 (1~28)</Label>
            <Input
              id="billingAnchorDay"
              type="number"
              min={1}
              max={28}
              value={form.billingAnchorDay}
              onChange={(e) => setForm({ ...form, billingAnchorDay: e.target.value })}
              required
            />
          </div>
        );
      case 'fiscalYearStart': {
        const fiscal = fiscalYearDefaults();
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="fiscalYearStart">사업연도 시작</Label>
            <Input
              id="fiscalYearStart"
              type="date"
              value={form.fiscalYearStart}
              onChange={(e) => setForm({ ...form, fiscalYearStart: e.target.value })}
              placeholder={fiscal.startPlaceholder}
              title={fiscal.startPlaceholder}
              required
            />
            <p className="text-xs text-muted-foreground">예: {fiscal.startPlaceholder}</p>
          </div>
        );
      }
      case 'fiscalYearEnd': {
        const fiscal = fiscalYearDefaults();
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="fiscalYearEnd">사업연도 종료</Label>
            <Input
              id="fiscalYearEnd"
              type="date"
              value={form.fiscalYearEnd}
              onChange={(e) => setForm({ ...form, fiscalYearEnd: e.target.value })}
              placeholder={fiscal.endPlaceholder}
              title={fiscal.endPlaceholder}
              required
            />
            <p className="text-xs text-muted-foreground">예: {fiscal.endPlaceholder}</p>
          </div>
        );
      }
      case 'eventDate':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="eventDate">기준일</Label>
            <Input
              id="eventDate"
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              required
            />
          </div>
        );
      case 'workSubtype':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="workSubtype">세부 업무</Label>
            <select
              id="workSubtype"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.workSubtype}
              onChange={(e) => {
                const subtype = e.target.value;
                const subtypeMeta = selectedTypeMeta?.subtypes.find(
                  (s) => s.id === subtype,
                );
                setForm((prev) => ({
                  ...prev,
                  workSubtype: subtype,
                  billingModel:
                    subtypeMeta?.defaultBillingModel ?? prev.billingModel,
                }));
              }}
              required
            >
              <option value="">선택</option>
              {(selectedTypeMeta?.subtypes ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'baseFeeAmount':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="baseFeeAmount">기본금</Label>
            <Input
              id="baseFeeAmount"
              type="text"
              inputMode={form.currency === 'USD' ? 'decimal' : 'numeric'}
              autoComplete="off"
              value={form.baseFeeAmount}
              onChange={(e) => handleMoneyChange('baseFeeAmount', e.target.value)}
              placeholder={form.currency === 'USD' ? '0.00' : '0'}
              required
            />
          </div>
        );
      case 'successFeeRate':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="successFeeRate">성공보수율 (%)</Label>
            <Input
              id="successFeeRate"
              type="number"
              min={0}
              max={100}
              value={form.successFeeRate}
              onChange={(e) => setForm({ ...form, successFeeRate: e.target.value })}
              required
            />
          </div>
        );
      case 'hourlyRate':
        return (
          <div key={field} className="space-y-2">
            <Label htmlFor="hourlyRate">시간당 단가</Label>
            <Input
              id="hourlyRate"
              type="text"
              inputMode={form.currency === 'USD' ? 'decimal' : 'numeric'}
              autoComplete="off"
              value={form.hourlyRate}
              onChange={(e) => handleMoneyChange('hourlyRate', e.target.value)}
              placeholder={form.currency === 'USD' ? '0.00' : '0'}
            />
          </div>
        );
      case 'notes':
        return null;
      default:
        return null;
    }
  }

  const extraFields = selectedTypeMeta?.requiredFields ?? [];
  const showTaxAmendmentFields =
    form.projectType === 'OtherWork' && form.workSubtype === 'TaxAmendment';
  const showLoanDocFields =
    form.projectType === 'OtherWork' && form.workSubtype === 'LoanDocuments';

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">프로젝트</h1>
        <p className="mt-1 text-muted-foreground">
          업무 유형별 프로젝트를 등록하고 계약 메타데이터를 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '프로젝트 수정' : '프로젝트 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">고객</Label>
              <select
                id="clientId"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                disabled={!!editingId}
                required={!editingId}
              >
                <option value="">고객 선택</option>
                {clients.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">업무 유형</Label>
              <select
                id="projectType"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.projectType}
                onChange={(e) => applyTypeDefaults(e.target.value as ProjectType)}
                required
              >
                {typeMetas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingModel">청구 모델</Label>
              <select
                id="billingModel"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.billingModel}
                onChange={(e) =>
                  setForm({ ...form, billingModel: e.target.value as BillingModel })
                }
              >
                {billingMetas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {extraFields.map((field) => renderDynamicField(field))}
            {showTaxAmendmentFields && (
              <>
                {renderDynamicField('eventDate')}
                {renderDynamicField('baseFeeAmount')}
                {renderDynamicField('successFeeRate')}
              </>
            )}
            {showLoanDocFields && (
              <>
                {renderDynamicField('contractAmount')}
                {renderDynamicField('hourlyRate')}
              </>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="projectName">프로젝트명</Label>
              <Input
                id="projectName"
                value={form.projectName}
                onChange={(e) => {
                  setNameTouched(true);
                  setForm({ ...form, projectName: e.target.value });
                }}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">메모</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {editingId && (
              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    value &&
                    setForm({ ...form, status: value as 'Active' | 'Completed' })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">진행 중</SelectItem>
                    <SelectItem value="Completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive sm:col-span-2">{error}</p>
            )}
            {notice && (
              <p className="text-sm text-amber-600 sm:col-span-2">{notice}</p>
            )}

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editingId ? '수정' : '등록'}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  취소
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>프로젝트 목록</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">모든 유형</option>
              {typeMetas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">모든 상태</option>
              <option value="Active">진행 중</option>
              <option value="Completed">완료</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : filteredProjects.length === 0 ? (
            <p className="text-muted-foreground">등록된 프로젝트가 없습니다.</p>
          ) : (
            <ResponsiveDataView
              mobile={
                <div className="flex flex-col gap-3">
                  {filteredProjects.map((project) => (
                    <DataRecordCard key={project._id}>
                      <p className="font-semibold">{project.projectName}</p>
                      <DataRecordRow label="고객">
                        {project.clientName}
                        {project.clientCode ? ` (${project.clientCode})` : ''}
                      </DataRecordRow>
                      <DataRecordRow label="유형">
                        {project.workSubtypeLabel ?? project.projectTypeLabel}
                      </DataRecordRow>
                      <DataRecordRow label="청구">
                        {project.billingModelLabel}
                        {project.contractAmount !== undefined && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            {formatMoney(project.contractAmount, project.currency)}
                          </span>
                        )}
                      </DataRecordRow>
                      <DataRecordRow label="상태">
                        {project.status === 'Active' ? '진행 중' : '완료'}
                      </DataRecordRow>
                      <DataRecordActions>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(project)}>
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(project._id)}
                        >
                          삭제
                        </Button>
                      </DataRecordActions>
                    </DataRecordCard>
                  ))}
                </div>
              }
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트명</TableHead>
                      <TableHead>고객</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>청구</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project._id}>
                        <TableCell>{project.projectName}</TableCell>
                        <TableCell>
                          {project.clientName}
                          {project.clientCode ? ` (${project.clientCode})` : ''}
                        </TableCell>
                        <TableCell>
                          {project.workSubtypeLabel ?? project.projectTypeLabel}
                        </TableCell>
                        <TableCell>
                          {project.billingModelLabel}
                          {project.contractAmount !== undefined && (
                            <span className="ml-1 text-muted-foreground">
                              {formatMoney(project.contractAmount, project.currency)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project.status === 'Active' ? '진행 중' : '완료'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(project)}
                          >
                            수정
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(project._id)}
                          >
                            삭제
                          </Button>
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
