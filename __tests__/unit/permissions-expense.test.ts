import { canEditExpense, type SessionUser, type ExpenseLike } from '@/lib/permissions';

describe('canEditExpense', () => {
  const preparerId = 'preparer-user-id';
  const otherId = 'other-user-id';

  const baseExpense: ExpenseLike = {
    userId: preparerId,
    status: 'Pending',
  };

  const preparer: SessionUser = { userId: preparerId, role: 'Preparer' };
  const approver: SessionUser = { userId: 'approver-id', role: 'Approver' };
  const admin: SessionUser = { userId: 'admin-id', role: 'Admin' };

  it('denies all roles when expense is locked', () => {
    const locked = { ...baseExpense, lockedAt: new Date() };
    expect(canEditExpense(preparer, locked)).toBe(false);
    expect(canEditExpense(approver, locked)).toBe(false);
    expect(canEditExpense(admin, locked)).toBe(false);
  });

  it('allows Preparer to edit own Pending expense', () => {
    expect(canEditExpense(preparer, { ...baseExpense, status: 'Pending' })).toBe(true);
  });

  it('allows Preparer to edit own Rejected expense', () => {
    expect(canEditExpense(preparer, { ...baseExpense, status: 'Rejected' })).toBe(true);
  });

  it('denies Preparer editing own Approved expense', () => {
    expect(canEditExpense(preparer, { ...baseExpense, status: 'Approved' })).toBe(false);
  });

  it('denies Preparer editing another user expense', () => {
    expect(canEditExpense(preparer, { ...baseExpense, userId: otherId })).toBe(false);
  });

  it('allows Approver to edit unlocked expenses regardless of owner or status', () => {
    expect(canEditExpense(approver, { ...baseExpense, status: 'Pending' })).toBe(true);
    expect(canEditExpense(approver, { ...baseExpense, userId: otherId, status: 'Approved' })).toBe(
      true,
    );
  });

  it('allows Admin to edit unlocked expenses regardless of owner or status', () => {
    expect(canEditExpense(admin, { ...baseExpense, status: 'Approved' })).toBe(true);
    expect(canEditExpense(admin, { ...baseExpense, userId: otherId, status: 'Rejected' })).toBe(
      true,
    );
  });
});
