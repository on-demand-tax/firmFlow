import { resolveNewUserRole } from '@/lib/onboarding';

describe('resolveNewUserRole', () => {
  const initial = 'admin@yourfirm.com';

  it('creates Admin when no admin exists and email matches INITIAL_ADMIN_EMAIL', () => {
    expect(resolveNewUserRole('admin@yourfirm.com', 0, initial)).toBe('Admin');
  });

  it('rejects when no admin exists and email does not match', () => {
    expect(resolveNewUserRole('other@yourfirm.com', 0, initial)).toBeNull();
  });

  it('creates Preparer when admin already exists', () => {
    expect(resolveNewUserRole('other@yourfirm.com', 1, initial)).toBe('Preparer');
  });

  it('allows INITIAL_ADMIN_EMAIL to create Admin even when admin exists (recovery)', () => {
    expect(resolveNewUserRole('admin@yourfirm.com', 1, initial)).toBe('Admin');
  });
});
