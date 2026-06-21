import { getMonthRangeSeoul } from '@/lib/dates';

describe('getMonthRangeSeoul', () => {
  it('returns March 2026 range in Seoul', () => {
    const { start, end } = getMonthRangeSeoul(2026, 3);
    expect(start).toEqual(new Date('2026-03-01T00:00:00+09:00'));
    expect(end).toEqual(new Date('2026-03-31T23:59:59.999+09:00'));
  });

  it('returns February 2024 range (leap year)', () => {
    const { start, end } = getMonthRangeSeoul(2024, 2);
    expect(start).toEqual(new Date('2024-02-01T00:00:00+09:00'));
    expect(end).toEqual(new Date('2024-02-29T23:59:59.999+09:00'));
  });

  it('returns December range', () => {
    const { start, end } = getMonthRangeSeoul(2025, 12);
    expect(start).toEqual(new Date('2025-12-01T00:00:00+09:00'));
    expect(end).toEqual(new Date('2025-12-31T23:59:59.999+09:00'));
  });
});
