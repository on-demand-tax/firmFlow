'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface TimesheetFormValues {
  date: string;
  clientId: string;
  projectId: string;
  hours: number;
  description: string;
}

export interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
}

export function validateTimesheetForm(values: TimesheetFormValues): string | null {
  if (!values.date || !values.projectId || !values.description.trim()) {
    return '필수 항목을 입력해 주세요';
  }
  if (values.hours < 0.5 || values.hours > 24) {
    return '시간은 0.5~24 사이여야 합니다';
  }
  return null;
}

interface TimesheetFormProps {
  projects: ProjectOption[];
  onSubmit: (values: TimesheetFormValues) => Promise<void>;
  submitting?: boolean;
}

const emptyForm = {
  date: '',
  projectId: '',
  hours: '',
  description: '',
};

export function TimesheetForm({ projects, onSubmit, submitting = false }: TimesheetFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const selected = projects.find((p) => p.value === form.projectId);
    const values: TimesheetFormValues = {
      date: form.date,
      clientId: selected?.clientId ?? '',
      projectId: form.projectId,
      hours: Number(form.hours),
      description: form.description,
    };

    const validationError = validateTimesheetForm(values);
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
        <Label htmlFor="date">작업일</Label>
        <Input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project">프로젝트</Label>
        <select
          id="project"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={form.projectId}
          onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          required
        >
          <option value="">선택</option>
          {projects.map((p) => (
            <option key={p.value} value={p.value}>
              {p.clientName} — {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hours">시간</Label>
        <Input
          id="hours"
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          value={form.hours}
          onChange={(e) => setForm({ ...form, hours: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">작업 내용</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
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
