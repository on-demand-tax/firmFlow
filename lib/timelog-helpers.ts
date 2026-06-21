import { TimeLogModel } from '@/models/TimeLog';
import { getDayRangeSeoul, parseDateOnlySeoul } from '@/lib/dates';
import type { ITimeLog } from '@/models/TimeLog';

export function serializeTimeLog(log: ITimeLog) {
  return {
    _id: String(log._id),
    userId: String(log.userId),
    clientId: String(log.clientId),
    projectId: String(log.projectId),
    date: log.date,
    hours: log.hours,
    description: log.description,
    status: log.status,
    approvedBy: log.approvedBy ? String(log.approvedBy) : undefined,
    lockedAt: log.lockedAt ?? undefined,
  };
}

export function isValidHours(hours: unknown): hours is number {
  return typeof hours === 'number' && hours >= 0.5 && hours <= 24;
}

export async function validateDailyHours(
  userId: string,
  date: Date,
  hours: number,
  excludeLogId?: string,
): Promise<boolean> {
  const { start, end } = getDayRangeSeoul(date);
  const filter: Record<string, unknown> = {
    userId,
    date: { $gte: start, $lte: end },
  };
  if (excludeLogId) {
    filter._id = { $ne: excludeLogId };
  }

  const existing = await TimeLogModel.find(filter).select('hours');
  const total = existing.reduce((sum, log) => sum + log.hours, 0) + hours;
  return total <= 24;
}

export function parseTimeLogDate(dateInput: unknown): Date | null {
  if (typeof dateInput !== 'string') return null;
  return parseDateOnlySeoul(dateInput);
}
