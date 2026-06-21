'use client';

import { useCallback, useEffect, useState } from 'react';

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
  userId: string;
  clientId: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
}

export default function ApprovalsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

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
      const all: TimeLog[] = await logsRes.json();
      setLogs(all.filter((log) => log.status === 'Pending'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadData();
    }
    void init();
  }, [loadData]);

  async function handleStatus(id: string, status: 'Approved' | 'Rejected') {
    setActingId(id);
    setError('');

    const res = await fetch(`/api/timelogs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    setActingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '처리에 실패했습니다');
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">승인 대기</h1>
        <p className="mt-1 text-muted-foreground">대기 중인 타임로그를 검토하고 승인합니다.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>대기 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">승인 대기 중인 항목이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작업일</TableHead>
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
                  const busy = actingId === log._id;
                  return (
                    <TableRow key={log._id}>
                      <TableCell>{formatDate(log.date)}</TableCell>
                      <TableCell>
                        {project ? `${project.clientName} — ${project.label}` : log.projectId}
                      </TableCell>
                      <TableCell>{log.hours}h</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">대기</Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => handleStatus(log._id, 'Approved')}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleStatus(log._id, 'Rejected')}
                        >
                          반려
                        </Button>
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
