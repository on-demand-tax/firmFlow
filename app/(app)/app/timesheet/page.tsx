'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TimesheetForm, type ProjectOption } from '@/components/app/TimesheetForm';
import TimesheetGrid from '@/components/TimesheetGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimeLog {
  _id: string;
  clientId: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: string;
}

export default function TimesheetPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
          description: log.description,
          status: log.status,
          lockedAt: log.lockedAt,
        };
      }),
    [logs, projectMap],
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
    void loadData();
  }, [loadData]);

  async function handleSubmit(values: {
    date: string;
    clientId: string;
    projectId: string;
    hours: number;
    description: string;
  }) {
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/timelogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    await loadData();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">내 타임시트</h1>
        <p className="mt-1 text-muted-foreground">작업 시간을 기록하고 내역을 확인합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시간 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <TimesheetForm projects={projects} onSubmit={handleSubmit} submitting={submitting} />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : (
            <TimesheetGrid viewMode="auto" entries={gridEntries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
