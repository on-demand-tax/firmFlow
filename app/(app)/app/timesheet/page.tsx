'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TimesheetForm, type ProjectOption, type TimesheetFormInitialValues } from '@/components/app/TimesheetForm';
import { WeekdayHoursSummary } from '@/components/app/WeekdayHoursSummary';
import TimesheetGrid from '@/components/TimesheetGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { canPreparerEditEntry } from '@/lib/entry-editability';
import { toDateInputValue } from '@/lib/dates';

interface TimeLog {
  _id: string;
  clientId: string;
  projectId: string;
  date: string;
  hours: number;
  activity?: string;
  activityLabel?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  lockedAt?: string;
}

export default function TimesheetPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'Pending' | 'Approved' | 'Rejected'
  >('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<TimesheetFormInitialValues | null>(null);

  const projectMap = Object.fromEntries(projects.map((p) => [p.value, p]));

  const gridEntries = useMemo(
    () =>
      logs.map((log) => {
        const project = projectMap[log.projectId];
        return {
          id: log._id,
          date: log.date,
          clientName: project?.clientName ?? '',
          projectLabel: project?.label ?? log.projectId,
          hours: log.hours,
          activityLabel: log.activityLabel,
          description: log.description,
          status: log.status,
          rejectionReason: log.rejectionReason,
          lockedAt: log.lockedAt,
          canEdit: canPreparerEditEntry(log),
        };
      }),
    [logs, projectMap],
  );

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'all') return gridEntries;
    return gridEntries.filter((entry) => entry.status === statusFilter);
  }, [gridEntries, statusFilter]);

  const rejectedCount = useMemo(
    () => gridEntries.filter((entry) => entry.status === 'Rejected').length,
    [gridEntries],
  );

  const hourEntries = useMemo(
    () => logs.map((log) => ({ date: log.date, hours: log.hours, status: log.status })),
    [logs],
  );

  const loadData = useCallback(async () => {
    const [projectsRes, logsRes] = await Promise.all([
      fetch('/api/projects/options'),
      fetch('/api/timelogs'),
    ]);

    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (logsRes.ok) {
      setLogs(await logsRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadData();
    }
    void init();
  }, [loadData]);

  async function handleSubmit(values: {
    date: string;
    clientId: string;
    projectId: string;
    hours: number;
    activity?: string;
    description: string;
  }) {
    setSubmitting(true);
    setError('');

    const url = editingId ? `/api/timelogs/${editingId}` : '/api/timelogs';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    cancelEdit();
    await loadData();
  }

  function startEdit(log: TimeLog) {
    const project = projectMap[log.projectId];
    setEditingId(log._id);
    setEditInitial({
      date: toDateInputValue(log.date),
      projectId: log.projectId,
      activity: log.activity,
      hours: log.hours,
      description: log.description,
      entryMode: project?.isNonBillable ? 'nonBillable' : 'client',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditInitial(null);
  }

  function handleGridEdit(entryId: string) {
    const log = logs.find((item) => item._id === entryId);
    if (log && canPreparerEditEntry(log)) {
      startEdit(log);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">내 타임시트</h1>
        <p className="mt-1 text-muted-foreground">작업 시간을 기록하고 내역을 확인합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '시간 수정' : '시간 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          <TimesheetForm
            key={editingId ?? 'new'}
            projects={projects}
            editingId={editingId}
            initialValues={editInitial}
            onCancelEdit={cancelEdit}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {!loading && <WeekdayHoursSummary entries={hourEntries} />}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>내 기록</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {rejectedCount > 0 && (
              <span className="text-sm text-muted-foreground">
                반려 {rejectedCount}건
              </span>
            )}
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | 'Pending' | 'Approved' | 'Rejected',
                )
              }
            >
              <option value="all">모든 상태</option>
              <option value="Pending">대기</option>
              <option value="Approved">승인</option>
              <option value="Rejected">반려</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : (
            <TimesheetGrid
              viewMode="auto"
              entries={filteredEntries}
              onEdit={(entry) => handleGridEdit(entry.id)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
