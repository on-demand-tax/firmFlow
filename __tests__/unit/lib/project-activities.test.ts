import {
  BOOKKEEPING_ACTIVITY_GROUPS,
  NON_BILLABLE_ACTIVITY_GROUPS,
  getActivityGroupsForProjectType,
  getActivityLabel,
  isValidActivityForProjectType,
  projectTypeRequiresActivity,
} from '@/lib/project-activities';

describe('project-activities', () => {
  it('returns bookkeeping groups for BookkeepingAgency and legacy MonthlyBookkeeping', () => {
    expect(getActivityGroupsForProjectType('BookkeepingAgency')).toEqual(
      BOOKKEEPING_ACTIVITY_GROUPS,
    );
    expect(getActivityGroupsForProjectType('MonthlyBookkeeping')).toEqual(
      BOOKKEEPING_ACTIVITY_GROUPS,
    );
    expect(getActivityGroupsForProjectType('General')).toBeNull();
  });

  it('requires activity for bookkeeping and non-billable projects only', () => {
    expect(projectTypeRequiresActivity('BookkeepingAgency')).toBe(true);
    expect(projectTypeRequiresActivity('NonBillable')).toBe(true);
    expect(projectTypeRequiresActivity('FilingAgency')).toBe(false);
  });

  it('validates bookkeeping activity ids', () => {
    expect(isValidActivityForProjectType('BookkeepingAgency', 'VatFiling')).toBe(true);
    expect(isValidActivityForProjectType('BookkeepingAgency', 'Invalid')).toBe(false);
    expect(isValidActivityForProjectType('General', 'VatFiling')).toBe(false);
  });

  it('validates non-billable activity ids', () => {
    expect(isValidActivityForProjectType('NonBillable', 'ADMIN_IT')).toBe(true);
    expect(isValidActivityForProjectType('NonBillable', 'RND_TOOL_DEV')).toBe(true);
    expect(isValidActivityForProjectType('NonBillable', 'VatFiling')).toBe(false);
    expect(NON_BILLABLE_ACTIVITY_GROUPS).toHaveLength(6);
  });

  it('returns Korean labels', () => {
    expect(getActivityLabel('BookkeepingAgency', 'VatFiling')).toBe('부가가치세 신고');
    expect(getActivityLabel('BookkeepingAgency', 'PayrollAndInsurance')).toContain(
      '4대보험',
    );
    expect(getActivityLabel('NonBillable', 'ADMIN_IT')).toBe('IT 및 시스템 관리');
    expect(getActivityLabel('NonBillable', 'MKT_PROPOSAL')).toBe('신규 제안서 작성');
  });
});
