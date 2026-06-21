import { canApprove, isReadOnlyOnLeave } from '@/lib/permissions';

describe('permissions', () => {
  it('Admin can approve', () => expect(canApprove('Admin')).toBe(true));
  it('Approver can approve', () => expect(canApprove('Approver')).toBe(true));
  it('Preparer cannot approve', () => expect(canApprove('Preparer')).toBe(false));
  it('OnLeave is read-only for writes', () => {
    expect(isReadOnlyOnLeave('OnLeave')).toBe(true);
  });
  it('Active is not read-only', () => {
    expect(isReadOnlyOnLeave('Active')).toBe(false);
  });
});
