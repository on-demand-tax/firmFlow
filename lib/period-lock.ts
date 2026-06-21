import { PeriodLockModel } from '@/models/PeriodLock';
import { TimeLogModel } from '@/models/TimeLog';
import { datesOverlapInclusive } from '@/lib/dates';

export async function findOverlappingPeriodLock(
  startDate: Date,
  endDate: Date,
  excludeId?: string,
) {
  const locks = await PeriodLockModel.find(excludeId ? { _id: { $ne: excludeId } } : {});
  return locks.find((lock) =>
    datesOverlapInclusive(startDate, endDate, lock.startDate, lock.endDate),
  );
}

async function lockTimeLogsInRange(startDate: Date, endDate: Date, lockedAt: Date) {
  await TimeLogModel.updateMany(
    { date: { $gte: startDate, $lte: endDate } },
    { $set: { lockedAt } },
  );
}

async function unlockTimeLogsInRange(startDate: Date, endDate: Date) {
  await TimeLogModel.updateMany(
    { date: { $gte: startDate, $lte: endDate } },
    { $unset: { lockedAt: '' } },
  );
}

/** Expense locking deferred to Task 17 — no-op stub */
export async function lockExpensesInRange(_startDate: Date, _endDate: Date, _lockedAt: Date) {
  // no-op
}

/** Expense unlocking deferred to Task 17 — no-op stub */
export async function unlockExpensesInRange(_startDate: Date, _endDate: Date) {
  // no-op
}

export async function applyPeriodLock(
  startDate: Date,
  endDate: Date,
  lockedBy: string,
  note?: string,
) {
  const overlap = await findOverlappingPeriodLock(startDate, endDate);
  if (overlap) {
    return { error: 'OVERLAP' as const };
  }

  const lockedAt = new Date();
  const lock = await PeriodLockModel.create({
    startDate,
    endDate,
    lockedBy,
    lockedAt,
    note,
  });

  await lockTimeLogsInRange(startDate, endDate, lockedAt);
  await lockExpensesInRange(startDate, endDate, lockedAt);

  return { lock };
}

export async function removePeriodLock(lockId: string) {
  const lock = await PeriodLockModel.findById(lockId);
  if (!lock) {
    return { error: 'NOT_FOUND' as const };
  }

  await unlockTimeLogsInRange(lock.startDate, lock.endDate);
  await unlockExpensesInRange(lock.startDate, lock.endDate);
  await lock.deleteOne();

  return { ok: true as const };
}
