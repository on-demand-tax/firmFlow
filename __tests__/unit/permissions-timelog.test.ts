import { canEditTimeLog, type SessionUser, type TimeLogLike } from '@/lib/permissions';

describe('canEditTimeLog', () => {
  const preparerId = 'preparer-user-id';
  const otherId = 'other-user-id';

  const baseLog: TimeLogLike = {
    userId: preparerId,
    status: 'Pending',
  };

  const preparer: SessionUser = { userId: preparerId, role: 'Preparer' };
  const approver: SessionUser = { userId: 'approver-id', role: 'Approver' };
  const admin: SessionUser = { userId: 'admin-id', role: 'Admin' };

  it('denies all roles when log is locked', () => {
    const locked = { ...baseLog, lockedAt: new Date() };
    expect(canEditTimeLog(preparer, locked)).toBe(false);
    expect(canEditTimeLog(approver, locked)).toBe(false);
    expect(canEditTimeLog(admin, locked)).toBe(false);
  });

  it('allows Preparer to edit own Pending log', () => {
    expect(canEditTimeLog(preparer, { ...baseLog, status: 'Pending' })).toBe(true);
  });

  it('allows Preparer to edit own Rejected log', () => {
    expect(canEditTimeLog(preparer, { ...baseLog, status: 'Rejected' })).toBe(true);
  });

  it('denies Preparer editing own Approved log', () => {
    expect(canEditTimeLog(preparer, { ...baseLog, status: 'Approved' })).toBe(false);
  });

  it('denies Preparer editing another user log', () => {
    expect(canEditTimeLog(preparer, { ...baseLog, userId: otherId })).toBe(false);
  });

  it('allows Approver to edit unlocked logs regardless of owner or status', () => {
    expect(canEditTimeLog(approver, { ...baseLog, status: 'Pending' })).toBe(true);
    expect(canEditTimeLog(approver, { ...baseLog, userId: otherId, status: 'Approved' })).toBe(
      true,
    );
  });

  it('allows Admin to edit unlocked logs regardless of owner or status', () => {
    expect(canEditTimeLog(admin, { ...baseLog, status: 'Approved' })).toBe(true);
    expect(canEditTimeLog(admin, { ...baseLog, userId: otherId, status: 'Rejected' })).toBe(
      true,
    );
  });
});
