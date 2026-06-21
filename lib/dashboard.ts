import { calculateProjectCost } from '@/lib/billingUtils';
import {
  getMonthRangeSeoul,
  getSeoulDateKey,
  parseDateOnlySeoul,
} from '@/lib/dates';
import type { ISalaryHistory } from '@/models/User';

export interface DashboardPeriod {
  from: string;
  to: string;
  start: Date;
  end: Date;
}

export function parseDashboardPeriod(
  searchParams: URLSearchParams,
  now: Date = new Date(),
): DashboardPeriod | { error: string } {
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  if (fromParam && toParam) {
    const start = parseDateOnlySeoul(fromParam);
    const endDay = parseDateOnlySeoul(toParam);
    if (!start || !endDay) {
      return { error: '날짜 형식이 올바르지 않습니다' };
    }
    const end = new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    if (start > end) {
      return { error: '시작일은 종료일보다 이전이어야 합니다' };
    }
    return { from: fromParam, to: toParam, start, end };
  }

  if (yearParam !== null || monthParam !== null) {
    const year = Number(yearParam);
    const month = Number(monthParam);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return { error: '연·월 형식이 올바르지 않습니다' };
    }
    const range = getMonthRangeSeoul(year, month);
    return {
      from: getSeoulDateKey(range.start),
      to: getSeoulDateKey(range.end),
      start: range.start,
      end: range.end,
    };
  }

  const seoulKey = getSeoulDateKey(now);
  const [year, month] = seoulKey.split('-').map(Number);
  const range = getMonthRangeSeoul(year, month);
  return {
    from: getSeoulDateKey(range.start),
    to: getSeoulDateKey(range.end),
    start: range.start,
    end: range.end,
  };
}

export function sumLaborCost(
  logs: Array<{ hours: number; date: Date }>,
  salaryTable: ISalaryHistory[],
): number {
  return logs.reduce(
    (sum, log) => sum + calculateProjectCost(log.hours, log.date, salaryTable),
    0,
  );
}
