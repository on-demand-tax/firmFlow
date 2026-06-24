'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProjectActivityGroup } from '@/lib/project-activities';
import {
  TIMELOG_HOURS_MIN,
  TIMELOG_HOURS_MAX,
  TIMELOG_HOURS_STEP,
  TIMELOG_HOURS_RANGE_MESSAGE,
} from '@/lib/timelog-hours';

export interface TimesheetFormValues {
  date: string;
  clientId: string;
  projectId: string;
  hours: number;
  activity?: string;
  description: string;
}

export interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
  activityGroups?: ProjectActivityGroup[] | null;
  isNonBillable?: boolean;
}

export type TimesheetEntryMode = 'client' | 'nonBillable';

export function validateTimesheetForm(
  values: TimesheetFormValues,
  options?: { requiresActivity?: boolean },
): string | null {
  if (!values.date || !values.projectId) {
    return '필수 항목을 입력해 주세요';
  }
  if (options?.requiresActivity && !values.activity) {
    return '업무 액티비티를 선택해 주세요';
  }
  if (!values.description.trim() && !values.activity) {
    return '필수 항목을 입력해 주세요';
  }
  if (values.hours < TIMELOG_HOURS_MIN || values.hours > TIMELOG_HOURS_MAX) {
    return TIMELOG_HOURS_RANGE_MESSAGE;
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
  activity: '',
  hours: '',
  description: '',
};

export function TimesheetForm({ projects, onSubmit, submitting = false }: TimesheetFormProps) {
  const nonBillableProject = useMemo(
    () => projects.find((project) => project.isNonBillable),
    [projects],
  );
  const clientProjects = useMemo(
    () => projects.filter((project) => !project.isNonBillable),
    [projects],
  );

  const [entryMode, setEntryMode] = useState<TimesheetEntryMode>('client');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const visibleProjects = entryMode === 'nonBillable' && nonBillableProject
    ? [nonBillableProject]
    : clientProjects;

  const selectedProject = useMemo(() => {
    if (entryMode === 'nonBillable' && nonBillableProject) {
      return nonBillableProject;
    }
    return projects.find((project) => project.value === form.projectId);
  }, [entryMode, form.projectId, nonBillableProject, projects]);

  const requiresActivity = Boolean(
    selectedProject?.activityGroups && selectedProject.activityGroups.length > 0,
  );

  function handleEntryModeChange(mode: TimesheetEntryMode) {
    setEntryMode(mode);
    if (mode === 'nonBillable' && nonBillableProject) {
      setForm({
        ...emptyForm,
        projectId: nonBillableProject.value,
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const projectId =
      entryMode === 'nonBillable' && nonBillableProject
        ? nonBillableProject.value
        : form.projectId;
    const selected = projects.find((project) => project.value === projectId);
    const values: TimesheetFormValues = {
      date: form.date,
      clientId: selected?.clientId ?? '',
      projectId,
      hours: Number(form.hours),
      activity: form.activity || undefined,
      description: form.description,
    };

    const validationError = validateTimesheetForm(values, { requiresActivity });
    if (validationError) {
      setError(validationError);
      return;
    }

    await onSubmit(values);
    if (entryMode === 'nonBillable' && nonBillableProject) {
      setForm({
        ...emptyForm,
        projectId: nonBillableProject.value,
      });
    } else {
      setForm(emptyForm);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>입력 구분</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={entryMode === 'client' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleEntryModeChange('client')}
          >
            고객 프로젝트
          </Button>
          <Button
            type="button"
            variant={entryMode === 'nonBillable' ? 'default' : 'outline'}
            size="sm"
            disabled={!nonBillableProject}
            onClick={() => handleEntryModeChange('nonBillable')}
          >
            비청구 시간
          </Button>
        </div>
        {entryMode === 'nonBillable' && (
          <p className="text-sm text-muted-foreground">
            행정, 연구, 교육, 마케팅, 휴가, 유휴 시간 등 고객에게 청구하지 않는 업무를 기록합니다.
          </p>
        )}
      </div>
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
      {entryMode === 'client' && (
        <div className="space-y-2">
          <Label htmlFor="project">프로젝트</Label>
          <select
            id="project"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={form.projectId}
            onChange={(e) =>
              setForm({ ...form, projectId: e.target.value, activity: '' })
            }
            required
          >
            <option value="">선택</option>
            {visibleProjects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.clientName} — {project.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {requiresActivity && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="activity">
            {entryMode === 'nonBillable' ? '비청구 활동' : '업무 액티비티'}
          </Label>
          <select
            id="activity"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
            required
          >
            <option value="">선택</option>
            {selectedProject?.activityGroups?.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="hours">시간</Label>
        <Input
          id="hours"
          type="number"
          min={TIMELOG_HOURS_MIN}
          max={TIMELOG_HOURS_MAX}
          step={TIMELOG_HOURS_STEP}
          value={form.hours}
          onChange={(e) => setForm({ ...form, hours: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">
          {requiresActivity ? '추가 메모 (선택)' : '작업 내용'}
        </Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required={!requiresActivity}
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
