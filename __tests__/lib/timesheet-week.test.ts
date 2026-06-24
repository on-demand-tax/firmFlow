import { parseDateOnlySeoul } from '@/lib/dates';
import {
  buildWeekdayHoursSummary,
  normalizeEntryDateKey,
  sumApprovedHoursByDateKey,
  sumHoursByDateKey,
} from '@/lib/timesheet-week';

describe('timesheet-week', () => {
  it('normalizes ISO date strings to Seoul date keys', () => {
    expect(normalizeEntryDateKey('2026-06-20')).toBe('2026-06-20');
    expect(normalizeEntryDateKey('2026-06-19T15:00:00.000Z')).toBe('2026-06-20');
  });

  it('sums hours by date key', () => {
    const totals = sumHoursByDateKey([
      { date: '2026-06-16', hours: 4 },
      { date: '2026-06-16', hours: 2 },
      { date: '2026-06-17', hours: 6 },
    ]);
    expect(totals.get('2026-06-16')).toBe(6);
    expect(totals.get('2026-06-17')).toBe(6);
  });

  it('sums approved hours by date key', () => {
    const totals = sumApprovedHoursByDateKey([
      { date: '2026-06-16', hours: 4, status: 'Approved' },
      { date: '2026-06-16', hours: 2, status: 'Pending' },
      { date: '2026-06-17', hours: 6, status: 'Approved' },
      { date: '2026-06-17', hours: 1, status: 'Rejected' },
    ]);
    expect(totals.get('2026-06-16')).toBe(4);
    expect(totals.get('2026-06-17')).toBe(6);
  });

  it('builds Mon–Sun summary for the anchor week', () => {
    const anchor = parseDateOnlySeoul('2026-06-20')!;
    const summary = buildWeekdayHoursSummary(
      [
        { date: '2026-06-16', hours: 8, status: 'Approved' },
        { date: '2026-06-17', hours: 4, status: 'Pending' },
        { date: '2026-06-20', hours: 2, status: 'Approved' },
      ],
      anchor,
    );

    expect(summary.days.map((day) => day.dateKey)).toEqual([
      '2026-06-15',
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
      '2026-06-21',
    ]);
    expect(summary.days.map((day) => day.hours)).toEqual([0, 8, 4, 0, 0, 2, 0]);
    expect(summary.days.map((day) => day.approvedHours)).toEqual([0, 8, 0, 0, 0, 2, 0]);
    expect(summary.days.map((day) => day.hasUnapprovedHours)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(summary.days.map((day) => day.isWeekend)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(summary.weekTotal).toBe(14);
    expect(summary.weekApprovedTotal).toBe(10);
    expect(summary.weekLabel).toBe('6/15 ~ 6/21');
  });
});
