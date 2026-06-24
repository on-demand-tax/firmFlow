const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export function parseDateOnlySeoul(dateInput: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day) - SEOUL_OFFSET_MS);
  if (getSeoulDateKey(parsed) !== dateInput) return null;
  return parsed;
}

export function getSeoulDateKey(date: Date): string {
  const seoul = new Date(date.getTime() + SEOUL_OFFSET_MS);
  const y = seoul.getUTCFullYear();
  const m = String(seoul.getUTCMonth() + 1).padStart(2, '0');
  const d = String(seoul.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayRangeSeoul(date: Date): { start: Date; end: Date } {
  const start = parseDateOnlySeoul(getSeoulDateKey(date))!;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export function datesOverlapInclusive(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function getMonthRangeSeoul(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1) - SEOUL_OFFSET_MS);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = new Date(
    Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - SEOUL_OFFSET_MS,
  );
  return { start, end };
}

/** Monday 00:00 Seoul for the week containing `date`. */
export function getWeekMondaySeoul(date: Date): Date {
  const key = getSeoulDateKey(date);
  const dayStart = parseDateOnlySeoul(key)!;
  const seoul = new Date(date.getTime() + SEOUL_OFFSET_MS);
  const dayOfWeek = seoul.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return new Date(dayStart.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
}

/** Mon–Fri date keys (YYYY-MM-DD) for the week containing `anchorDate`. */
export function getWeekdayDateKeysSeoul(anchorDate: Date): string[] {
  const monday = getWeekMondaySeoul(anchorDate);
  return Array.from({ length: 5 }, (_, index) =>
    getSeoulDateKey(new Date(monday.getTime() + index * 24 * 60 * 60 * 1000)),
  );
}

/** Mon–Sun date keys (YYYY-MM-DD) for the week containing `anchorDate`. */
export function getWeekDateKeysSeoul(anchorDate: Date): string[] {
  const monday = getWeekMondaySeoul(anchorDate);
  return Array.from({ length: 7 }, (_, index) =>
    getSeoulDateKey(new Date(monday.getTime() + index * 24 * 60 * 60 * 1000)),
  );
}

export function addDaysSeoul(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** `<input type="date">` 값 — 서울 기준 YYYY-MM-DD */
export function toDateInputValue(dateInput: string | Date): string {
  return getSeoulDateKey(new Date(dateInput));
}
