import {
  getDocumentExpiryInfo,
  isExpiringWithinDays,
  sortByExpiryUrgency,
} from '@/lib/document-expiry';
import { addDaysSeoul, parseDateOnlySeoul } from '@/lib/dates';

describe('document-expiry', () => {
  const now = parseDateOnlySeoul('2026-06-25')!;

  it('returns none when expiresAt is missing', () => {
    expect(getDocumentExpiryInfo(null, now)).toEqual({
      status: 'none',
      daysRemaining: null,
      label: null,
    });
  });

  it('returns today when expires today in Seoul', () => {
    const expiresAt = parseDateOnlySeoul('2026-06-25')!;
    expect(getDocumentExpiryInfo(expiresAt, now)).toEqual({
      status: 'today',
      daysRemaining: 0,
      label: '오늘 만료',
    });
  });

  it('returns soon with D-N label within 30 days', () => {
    const expiresAt = parseDateOnlySeoul('2026-07-02')!;
    expect(getDocumentExpiryInfo(expiresAt, now)).toEqual({
      status: 'soon',
      daysRemaining: 7,
      label: 'D-7',
    });
  });

  it('returns expired for past dates', () => {
    const expiresAt = parseDateOnlySeoul('2026-06-24')!;
    expect(getDocumentExpiryInfo(expiresAt, now)).toEqual({
      status: 'expired',
      daysRemaining: -1,
      label: '만료',
    });
  });

  it('isExpiringWithinDays includes today and within window', () => {
    const today = parseDateOnlySeoul('2026-06-25')!;
    const inWeek = parseDateOnlySeoul('2026-07-02')!;
    const later = parseDateOnlySeoul('2026-08-01')!;

    expect(isExpiringWithinDays(today, 30, now)).toBe(true);
    expect(isExpiringWithinDays(inWeek, 30, now)).toBe(true);
    expect(isExpiringWithinDays(later, 30, now)).toBe(false);
    expect(isExpiringWithinDays(null, 30, now)).toBe(false);
  });

  it('sortByExpiryUrgency puts today first, then soon, then none', () => {
    const items = [
      { id: 'none', expiresAt: addDaysSeoul(now, 60) },
      { id: 'today', expiresAt: parseDateOnlySeoul('2026-06-25')! },
      { id: 'soon', expiresAt: parseDateOnlySeoul('2026-06-30')! },
    ];

    expect(sortByExpiryUrgency(items, now).map((item) => item.id)).toEqual([
      'today',
      'soon',
      'none',
    ]);
  });
});
