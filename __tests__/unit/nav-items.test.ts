import { getNavItemsForRole } from '@/lib/nav-items';

describe('getNavItemsForRole', () => {
  it('Preparer sees dashboard, timesheet, expenses only', () => {
    const hrefs = getNavItemsForRole('Preparer').map((i) => i.href);
    expect(hrefs).toEqual(['/app', '/app/timesheet', '/app/expenses']);
  });
  it('Approver adds approvals, clients, projects', () => {
    const hrefs = getNavItemsForRole('Approver').map((i) => i.href);
    expect(hrefs).toContain('/app/approvals');
    expect(hrefs).toContain('/app/clients');
    expect(hrefs).not.toContain('/app/admin/users');
  });
  it('Admin includes admin routes', () => {
    const hrefs = getNavItemsForRole('Admin').map((i) => i.href);
    expect(hrefs).toContain('/app/admin/users');
    expect(hrefs).toContain('/app/admin/locks');
    expect(hrefs).toContain('/app/admin/salary');
  });
});
