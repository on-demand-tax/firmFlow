'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface TimesheetGridEntry {
  id: string;
  date: string;
  clientName: string;
  projectLabel: string;
  hours: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: string;
}

interface TimesheetGridProps {
  entries: TimesheetGridEntry[];
  viewMode: 'auto' | 'mobile' | 'desktop';
}

const statusLabel: Record<TimesheetGridEntry['status'], string> = {
  Pending: '대기',
  Approved: '승인',
  Rejected: '반려',
};

const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function MobileCardStack({ entries }: { entries: TimesheetGridEntry[] }) {
  if (entries.length === 0) {
    return (
      <div data-testid="mobile-timesheet-card-stack">
        <p className="text-muted-foreground">등록된 타임로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div data-testid="mobile-timesheet-card-stack" className="flex flex-col gap-3">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{formatDate(entry.date)}</span>
              <Badge variant={entry.status === 'Approved' ? 'default' : 'secondary'}>
                {statusLabel[entry.status]}
                {entry.lockedAt ? ' (마감)' : ''}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {entry.clientName} — {entry.projectLabel}
            </p>
            <p className="text-sm">{entry.description}</p>
            <p className="text-sm font-semibold">{entry.hours}h</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DesktopMatrixGrid({ entries }: { entries: TimesheetGridEntry[] }) {
  const matrix = useMemo(() => {
    const dates = [...new Set(entries.map((e) => e.date))].sort();
    const projects = [...new Set(entries.map((e) => `${e.clientName} — ${e.projectLabel}`))].sort(
      (a, b) => a.localeCompare(b, 'ko'),
    );

    const cellMap = new Map<string, TimesheetGridEntry[]>();
    for (const entry of entries) {
      const key = `${entry.clientName} — ${entry.projectLabel}|${entry.date}`;
      const list = cellMap.get(key) ?? [];
      list.push(entry);
      cellMap.set(key, list);
    }

    return { dates, projects, cellMap };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div data-testid="desktop-matrix-grid-view">
        <p className="text-muted-foreground">등록된 타임로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div data-testid="desktop-matrix-grid-view" className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">프로젝트</TableHead>
            {matrix.dates.map((date) => (
              <TableHead key={date} className="min-w-[80px] text-center">
                {formatDate(date)}
              </TableHead>
            ))}
            <TableHead className="text-center">합계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.projects.map((projectKey) => {
            let rowTotal = 0;
            return (
              <TableRow key={projectKey}>
                <TableCell className="font-medium">{projectKey}</TableCell>
                {matrix.dates.map((date) => {
                  const cellEntries = matrix.cellMap.get(`${projectKey}|${date}`) ?? [];
                  const hours = cellEntries.reduce((sum, e) => sum + e.hours, 0);
                  rowTotal += hours;
                  const description = cellEntries.map((e) => e.description).join(', ');
                  return (
                    <TableCell key={date} className="text-center align-top">
                      {hours > 0 ? (
                        <div>
                          <span className="font-semibold">{hours}</span>
                          {description && (
                            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-semibold">{rowTotal}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TimesheetGrid({ entries, viewMode }: TimesheetGridProps) {
  const isMobileAuto = useIsMobile();
  const showMobile =
    viewMode === 'mobile' || (viewMode === 'auto' && isMobileAuto);

  if (showMobile) {
    return <MobileCardStack entries={entries} />;
  }

  return <DesktopMatrixGrid entries={entries} />;
}
