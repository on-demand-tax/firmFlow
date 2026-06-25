import {
  addDaysSeoul,
  getDayRangeSeoul,
  getSeoulDateKey,
  parseDateOnlySeoul,
} from '@/lib/dates';

export type DocumentExpiryStatus = 'none' | 'today' | 'soon' | 'expired';

export type DocumentExpiryInfo = {
  status: DocumentExpiryStatus;
  daysRemaining: number | null;
  label: string | null;
};

function startOfTodaySeoul(now: Date): Date {
  return getDayRangeSeoul(now).start;
}

function daysBetweenSeoulDates(fromKey: string, toKey: string): number {
  const from = parseDateOnlySeoul(fromKey)!;
  const to = parseDateOnlySeoul(toKey)!;
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function getDocumentExpiryInfo(
  expiresAt: Date | null | undefined,
  now = new Date(),
): DocumentExpiryInfo {
  if (!expiresAt) {
    return { status: 'none', daysRemaining: null, label: null };
  }

  const todayKey = getSeoulDateKey(now);
  const expiryKey = getSeoulDateKey(expiresAt);
  const diff = daysBetweenSeoulDates(todayKey, expiryKey);

  if (diff < 0) {
    return { status: 'expired', daysRemaining: diff, label: '만료' };
  }

  if (diff === 0) {
    return { status: 'today', daysRemaining: 0, label: '오늘 만료' };
  }

  if (diff <= 30) {
    return { status: 'soon', daysRemaining: diff, label: `D-${diff}` };
  }

  return { status: 'none', daysRemaining: diff, label: null };
}

export function isExpiringWithinDays(
  expiresAt: Date | null | undefined,
  withinDays: number,
  now = new Date(),
): boolean {
  if (!expiresAt) return false;

  const todayStart = startOfTodaySeoul(now);
  const expiryStart = getDayRangeSeoul(expiresAt).start;
  const windowEnd = addDaysSeoul(todayStart, withinDays);

  return expiryStart >= todayStart && expiryStart <= windowEnd;
}

export function sortByExpiryUrgency<T extends { expiresAt?: Date | null }>(
  items: T[],
  now = new Date(),
): T[] {
  const rank: Record<DocumentExpiryStatus, number> = {
    today: 0,
    soon: 1,
    expired: 2,
    none: 3,
  };

  return [...items].sort((a, b) => {
    const aInfo = getDocumentExpiryInfo(a.expiresAt, now);
    const bInfo = getDocumentExpiryInfo(b.expiresAt, now);
    const byStatus = rank[aInfo.status] - rank[bInfo.status];
    if (byStatus !== 0) return byStatus;

    if (aInfo.daysRemaining === null && bInfo.daysRemaining === null) return 0;
    if (aInfo.daysRemaining === null) return 1;
    if (bInfo.daysRemaining === null) return -1;
    return aInfo.daysRemaining - bInfo.daysRemaining;
  });
}
