import { cn } from '@/lib/utils';

/** Visual treatment for period-locked entries (no text suffix). */
export const LOCKED_ENTRY_CLASS = 'opacity-50';

export function lockedEntryClass(
  lockedAt?: string | Date | null,
  className?: string,
): string {
  return cn(lockedAt && LOCKED_ENTRY_CLASS, className);
}

export function lockedEntryTitle(lockedAt?: string | Date | null): string | undefined {
  return lockedAt ? '마감된 항목' : undefined;
}
