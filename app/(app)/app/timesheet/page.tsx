'use client';

import { useCallback, useEffect, useState } from 'react';

import { TimesheetForm, type ProjectOption } from '@/components/app/TimesheetForm';
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

const statusLabel: Record<TimeLog['status'], string> = {
  Pending: '대기',
  Approved: '승인',
  Rejected: '반려',
};

export default function TimesheetPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const projectMap = Object.fromEntries(projects.map((p) => [p.value, p]));

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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR');
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
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">등록된 타임로그가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작업일</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>시간</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const project = projectMap[log.projectId];
                  return (
                    <TableRow key={log._id}>
                      <TableCell>{formatDate(log.date)}</TableCell>
                      <TableCell>
                        {project ? `${project.clientName} — ${project.label}` : log.projectId}
                      </TableCell>
                      <TableCell>{log.hours}h</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'Approved' ? 'default' : 'secondary'}>
                          {statusLabel[log.status]}
                          {log.lockedAt ? ' (마감)' : ''}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
