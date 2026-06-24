'use client';

import { useCallback, useEffect, useState } from 'react';

import DashboardSummary from '@/components/app/DashboardSummary';
import {
  DataRecordCard,
  DataRecordRow,
} from '@/components/app/DataRecordCard';
import { ResponsiveDataView } from '@/components/app/ResponsiveDataView';
import { formatCurrencyTotals, formatMoney } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardProject {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  hours: number;
  laborCost: number;
  coreExpense: { KRW: number; USD: number };
}

interface DashboardData {
  period: { from: string; to: string };
  summary: {
    totalHours: number;
    totalLaborCost: number;
    totalCoreExpense: { KRW: number; USD: number };
    totalOverhead: { KRW: number; USD: number };
    pendingTimeLogCount: number;
    pendingExpenseCount: number;
  };
  projects: DashboardProject[];
  overhead: { KRW: number; USD: number };
}

interface ClientOption {
  value: string;
  label: string;
}

interface ProjectOption {
  value: string;
  label: string;
  clientId: string;
  clientName: string;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (clientId) params.set('clientId', clientId);
    if (projectId) params.set('projectId', projectId);

    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (!res.ok) {
      let message = '대시보드를 불러오지 못했습니다';
      try {
        const body = await res.json();
        message = body.error ?? message;
      } catch {
        // API may return an empty body when the server throws before jsonError.
      }
      setError(message);
      setData(null);
    } else {
      setData(await res.json());
    }
    setLoading(false);
  }, [year, month, clientId, projectId]);

  useEffect(() => {
    async function loadOptions() {
      const [clientsRes, projectsRes] = await Promise.all([
        fetch('/api/clients/options'),
        fetch('/api/projects/options'),
      ]);
      if (clientsRes.ok) {
        setClients(await clientsRes.json());
      }
      if (projectsRes.ok) {
        setProjects(await projectsRes.json());
      }
    }
    void loadOptions();
  }, []);

  useEffect(() => {
    async function init() {
      await loadDashboard();
    }
    void init();
  }, [loadDashboard]);

  function formatLaborCost(amount: number) {
    return formatMoney(amount, 'KRW');
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">대시보드</h1>
        <p className="mt-1 text-muted-foreground">
          승인된 시간·경비 집계와 미승인 현황을 확인합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="dash-year">연도</Label>
              <Input
                id="dash-year"
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dash-month">월</Label>
              <Input
                id="dash-month"
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dash-client">고객</Label>
              <select
                id="dash-client"
                className="w-full min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId('');
                }}
              >
                <option value="">전체</option>
                {clients.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dash-project">프로젝트</Label>
              <select
                id="dash-project"
                className="w-full min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">전체</option>
                {filteredProjects.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.clientName} — {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {data && (
            <p className="mt-4 text-sm text-muted-foreground">
              조회 기간: {data.period.from} ~ {data.period.to}
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : data ? (
        <>
          <DashboardSummary
            totalHours={data.summary.totalHours}
            totalLaborCost={data.summary.totalLaborCost}
            totalCoreExpense={data.summary.totalCoreExpense}
            totalOverhead={data.summary.totalOverhead}
            pendingTimeLogCount={data.summary.pendingTimeLogCount}
            pendingExpenseCount={data.summary.pendingExpenseCount}
          />

          <Card>
            <CardHeader>
              <CardTitle>프로젝트별 집계</CardTitle>
            </CardHeader>
            <CardContent>
              {data.projects.length === 0 ? (
                <p className="text-muted-foreground">해당 기간의 프로젝트 데이터가 없습니다.</p>
              ) : (
                <ResponsiveDataView
                  mobile={
                    <div className="flex flex-col gap-3">
                      {data.projects.map((project) => (
                        <DataRecordCard key={project.projectId}>
                          <p className="font-semibold">{project.projectName}</p>
                          <DataRecordRow label="고객">{project.clientName}</DataRecordRow>
                          <DataRecordRow label="시간">{project.hours}h</DataRecordRow>
                          <DataRecordRow label="인건비">
                            {formatLaborCost(project.laborCost)}
                          </DataRecordRow>
                          <DataRecordRow label="직접경비">
                            {formatCurrencyTotals(project.coreExpense)}
                          </DataRecordRow>
                        </DataRecordCard>
                      ))}
                      <DataRecordCard>
                        <p className="font-semibold">간접비 (전체)</p>
                        <DataRecordRow label="간접비">
                          {formatCurrencyTotals(data.overhead)}
                        </DataRecordRow>
                      </DataRecordCard>
                    </div>
                  }
                  desktop={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객</TableHead>
                          <TableHead>프로젝트</TableHead>
                          <TableHead className="text-right">시간</TableHead>
                          <TableHead className="text-right">인건비</TableHead>
                          <TableHead className="text-right">직접경비</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.projects.map((project) => (
                          <TableRow key={project.projectId}>
                            <TableCell>{project.clientName}</TableCell>
                            <TableCell>{project.projectName}</TableCell>
                            <TableCell className="text-right">{project.hours}h</TableCell>
                            <TableCell className="text-right">
                              {formatLaborCost(project.laborCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrencyTotals(project.coreExpense)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium">
                          <TableCell colSpan={2}>간접비 (전체)</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyTotals(data.overhead)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  }
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
