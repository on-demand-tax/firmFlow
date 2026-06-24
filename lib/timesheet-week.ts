import {
  addDaysSeoul,
  getSeoulDateKey,
  getWeekMondaySeoul,
  getWeekDateKeysSeoul,
  parseDateOnlySeoul,
} from '@/lib/dates';

export type TimesheetEntryStatus = 'Pending' | 'Approved' | 'Rejected';

export interface TimesheetHoursEntry {
  date: string;
  hours: number;
  status?: TimesheetEntryStatus;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export function normalizeEntryDateKey(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return getSeoulDateKey(new Date(date));
}

export function sumHoursByDateKey(entries: TimesheetHoursEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = normalizeEntryDateKey(entry.date);
    totals.set(key, (totals.get(key) ?? 0) + entry.hours);
  }
  return totals;
}

export function sumApprovedHoursByDateKey(
  entries: TimesheetHoursEntry[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== 'Approved') continue;
    const key = normalizeEntryDateKey(entry.date);
    totals.set(key, (totals.get(key) ?? 0) + entry.hours);
  }
  return totals;
}

export interface WeekdayHoursDay {
  dateKey: string;
  weekdayLabel: (typeof DAY_LABELS)[number];
  hours: number;
  approvedHours: number;
  hasUnapprovedHours: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function buildWeekdayHoursSummary(
  entries: TimesheetHoursEntry[],
  anchorDate: Date = new Date(),
): {
  days: WeekdayHoursDay[];
  weekTotal: number;
  weekApprovedTotal: number;
  weekLabel: string;
} {
  const dateKeys = getWeekDateKeysSeoul(anchorDate);
  const totals = sumHoursByDateKey(entries);
  const approvedTotals = sumApprovedHoursByDateKey(entries);
  const todayKey = getSeoulDateKey(new Date());

  const days = dateKeys.map((dateKey, index) => {
    const hours = totals.get(dateKey) ?? 0;
    const approvedHours = approvedTotals.get(dateKey) ?? 0;
    return {
      dateKey,
      weekdayLabel: DAY_LABELS[index],
      hours,
      approvedHours,
      hasUnapprovedHours: hours > approvedHours,
      isToday: dateKey === todayKey,
      isWeekend: index >= 5,
    };
  });

  const weekTotal = days.reduce((sum, day) => sum + day.hours, 0);
  const weekApprovedTotal = days.reduce((sum, day) => sum + day.approvedHours, 0);

  const monday = parseDateOnlySeoul(dateKeys[0])!;
  const sunday = parseDateOnlySeoul(dateKeys[6])!;
  const weekLabel = `${formatShortDate(monday)} ~ ${formatShortDate(sunday)}`;

  return { days, weekTotal, weekApprovedTotal, weekLabel };
}

export function shiftWeekAnchor(anchorDate: Date, weekOffset: number): Date {
  const monday = getWeekMondaySeoul(anchorDate);
  return addDaysSeoul(monday, weekOffset * 7);
}

function formatShortDate(date: Date): string {
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = seoul.getUTCMonth() + 1;
  const day = seoul.getUTCDate();
  return `${month}/${day}`;
}

export function formatHoursDisplay(hours: number): string {
  if (hours === 0) return '—';
  return `${hours}h`;
}
