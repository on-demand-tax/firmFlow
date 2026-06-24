import { canPreparerEditEntry } from '@/lib/entry-editability';

describe('canPreparerEditEntry', () => {
  it('allows Pending and Rejected when not locked', () => {
    expect(canPreparerEditEntry({ status: 'Pending' })).toBe(true);
    expect(canPreparerEditEntry({ status: 'Rejected' })).toBe(true);
  });

  it('disallows Approved entries', () => {
    expect(canPreparerEditEntry({ status: 'Approved' })).toBe(false);
  });

  it('disallows locked entries regardless of status', () => {
    expect(
      canPreparerEditEntry({
        status: 'Pending',
        lockedAt: '2026-06-01T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});
