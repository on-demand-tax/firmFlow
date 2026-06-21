const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

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
