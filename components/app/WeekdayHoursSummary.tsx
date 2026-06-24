'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildWeekdayHoursSummary,
  formatHoursDisplay,
  shiftWeekAnchor,
  type TimesheetHoursEntry,
} from '@/lib/timesheet-week';
import { cn } from '@/lib/utils';

interface WeekdayHoursSummaryProps {
  entries: TimesheetHoursEntry[];
}

function dayCellClassName(day: {
  hasUnapprovedHours: boolean;
  isToday: boolean;
  isWeekend: boolean;
}): string {
  if (day.hasUnapprovedHours) {
    return cn(
      'border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/25',
      day.isToday && 'border-amber-500 bg-amber-500/15 ring-amber-500/35',
    );
  }

  if (day.isToday) {
    return 'border-primary bg-primary/5';
  }

  if (day.isWeekend) {
    return 'border-muted-foreground/20 bg-muted/50';
  }

  return 'border-border bg-background';
}

function dayLabelClassName(day: {
  hasUnapprovedHours: boolean;
  isWeekend: boolean;
}): string {
  if (day.hasUnapprovedHours) {
    return 'text-amber-800 dark:text-amber-200';
  }
  if (day.isWeekend) {
    return 'text-muted-foreground/80';
  }
  return 'text-muted-foreground';
}

function dayHoursClassName(day: {
  hasUnapprovedHours: boolean;
  isWeekend: boolean;
  hours: number;
}): string {
  return cn(
    'font-semibold tabular-nums',
    day.hours === 0 && 'text-muted-foreground',
    day.hasUnapprovedHours && day.hours > 0 && 'text-amber-900 dark:text-amber-100',
    !day.hasUnapprovedHours && day.isWeekend && day.hours > 0 && 'text-muted-foreground',
  );
}

function formatDayDate(dateKey: string): string {
  return dateKey.slice(5).replace('-', '/');
}

export function WeekdayHoursSummary({ entries }: WeekdayHoursSummaryProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const anchorDate = useMemo(() => shiftWeekAnchor(new Date(), weekOffset), [weekOffset]);
  const summary = useMemo(
    () => buildWeekdayHoursSummary(entries, anchorDate),
    [entries, anchorDate],
  );

  const weekHasUnapproved = summary.days.some((day) => day.hasUnapprovedHours);

  return (
    <Card data-testid="weekday-hours-summary">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base">주간 일간 입력</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{summary.weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((offset) => offset - 1)}
            aria-label="이전 주"
          >
            ←
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
          >
            이번 주
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((offset) => offset + 1)}
            aria-label="다음 주"
          >
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:hidden">
          {summary.days.map((day) => (
            <div
              key={day.dateKey}
              data-testid={day.hasUnapprovedHours ? 'day-cell-unapproved' : 'day-cell'}
              data-date-key={day.dateKey}
              title={day.hasUnapprovedHours ? '미승인 시간이 포함된 날입니다' : undefined}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3',
                dayCellClassName(day),
              )}
            >
              <div>
                <p className={cn('text-sm font-medium', dayLabelClassName(day))}>
                  {day.weekdayLabel}
                  <span className="ml-2 text-muted-foreground">{formatDayDate(day.dateKey)}</span>
                </p>
              </div>
              <p className={cn('text-lg', dayHoursClassName(day))}>
                {formatHoursDisplay(day.hours)}
              </p>
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-7 gap-3 sm:grid">
          {summary.days.map((day) => (
            <div
              key={day.dateKey}
              data-testid={day.hasUnapprovedHours ? 'day-cell-unapproved' : 'day-cell'}
              data-date-key={day.dateKey}
              title={day.hasUnapprovedHours ? '미승인 시간이 포함된 날입니다' : undefined}
              className={cn(
                'rounded-lg border px-2 py-3 text-center',
                dayCellClassName(day),
              )}
            >
              <p className={cn('text-sm font-medium', dayLabelClassName(day))}>
                {day.weekdayLabel}
              </p>
              <p className={cn('mt-1 text-lg', dayHoursClassName(day))}>
                {formatHoursDisplay(day.hours)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDayDate(day.dateKey)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {weekHasUnapproved && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded border border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/25"
                aria-hidden
              />
              미승인 시간 포함
            </p>
          )}
          <p
            className={cn(
              'text-right text-sm text-muted-foreground',
              !weekHasUnapproved && 'ml-auto w-full',
            )}
          >
            주간 합계{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {formatHoursDisplay(summary.weekTotal)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
