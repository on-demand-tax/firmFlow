import {
  deriveBillingDefaults,
  validateProjectPayload,
  getProjectTypeLabel,
  getBillingModelLabel,
  canChangeBillingModel,
  getUserSelectableProjectTypes,
  buildProjectNameTemplate,
  PROJECT_TYPES,
  isLongLivedProjectType,
  normalizeLegacyProject,
} from '@/lib/project-types';

describe('PROJECT_TYPES', () => {
  it('includes all 11 project types', () => {
    expect(PROJECT_TYPES).toHaveLength(11);
    expect(PROJECT_TYPES).toContain('BookkeepingAgency');
    expect(PROJECT_TYPES).toContain('NonBillable');
    expect(PROJECT_TYPES).toContain('General');
  });

  it('excludes system-managed types from user selection', () => {
    expect(getUserSelectableProjectTypes()).not.toContain('NonBillable');
    expect(getUserSelectableProjectTypes()).toHaveLength(10);
  });
});

describe('normalizeLegacyProject', () => {
  it('maps MonthlyBookkeeping to BookkeepingAgency', () => {
    expect(normalizeLegacyProject({ projectType: 'MonthlyBookkeeping' })).toEqual({
      projectType: 'BookkeepingAgency',
      workSubtype: 'GeneralBookkeeping',
    });
  });

  it('maps TaxAmendment to OtherWork + TaxAmendment', () => {
    expect(normalizeLegacyProject({ projectType: 'TaxAmendment' })).toEqual({
      projectType: 'OtherWork',
      workSubtype: 'TaxAmendment',
    });
  });
});

describe('deriveBillingDefaults', () => {
  it('returns Retainer + Monthly for BookkeepingAgency', () => {
    expect(deriveBillingDefaults('BookkeepingAgency')).toEqual({
      billingModel: 'Retainer',
      billingCycle: 'Monthly',
    });
  });

  it('returns BasePlusSuccess for OtherWork TaxAmendment', () => {
    expect(deriveBillingDefaults('OtherWork', 'TaxAmendment')).toEqual({
      billingModel: 'BasePlusSuccess',
    });
  });

  it('returns Hourly for General', () => {
    expect(deriveBillingDefaults('General')).toEqual({
      billingModel: 'Hourly',
    });
  });
});

describe('validateProjectPayload', () => {
  it('rejects TaxAmendment without baseFeeAmount', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '경정',
        projectType: 'OtherWork',
        workSubtype: 'TaxAmendment',
        currency: 'KRW',
        eventDate: '2023-01-01',
        successFeeRate: 20,
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('기본금');
  });

  it('accepts valid TaxAmendment via legacy type', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '경정',
        projectType: 'TaxAmendment',
        currency: 'KRW',
        eventDate: '2023-01-01',
        baseFeeAmount: 500000,
        successFeeRate: 20,
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projectType).toBe('OtherWork');
      expect(result.data.workSubtype).toBe('TaxAmendment');
      expect(result.data.billingModel).toBe('BasePlusSuccess');
    }
  });

  it('rejects billingModel override from Preparer', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '기장',
        projectType: 'BookkeepingAgency',
        billingModel: 'Hourly',
        contractAmount: 100000,
        currency: 'KRW',
        billingAnchorDay: 15,
      },
      { isPatch: false, userRole: 'Preparer' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('allows Admin to override billingModel', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '기장',
        projectType: 'BookkeepingAgency',
        billingModel: 'Hourly',
        contractAmount: 100000,
        currency: 'KRW',
        billingAnchorDay: 15,
      },
      { isPatch: false, userRole: 'Admin' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.billingModel).toBe('Hourly');
  });

  it('rejects invalid successFeeRate', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '경정',
        projectType: 'OtherWork',
        workSubtype: 'TaxAmendment',
        currency: 'KRW',
        eventDate: '2023-01-01',
        baseFeeAmount: 100,
        successFeeRate: 150,
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(false);
  });

  it('rejects fiscal year range when start after end', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '감사',
        projectType: 'ExternalAudit',
        currency: 'KRW',
        contractAmount: 1000000,
        fiscalYearStart: '2026-12-31',
        fiscalYearEnd: '2026-01-01',
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(false);
  });

  it('rejects OtherWork LoanDocuments without contractAmount or hourlyRate', () => {
    const result = validateProjectPayload(
      {
        clientId: 'x',
        projectName: '대출서류',
        projectType: 'OtherWork',
        workSubtype: 'LoanDocuments',
        currency: 'KRW',
      },
      { isPatch: false, userRole: 'Approver' },
    );
    expect(result.ok).toBe(false);
  });
});

describe('getProjectTypeLabel', () => {
  it('returns Korean label for new and legacy types', () => {
    expect(getProjectTypeLabel('ExternalAudit')).toBe('외부감사');
    expect(getProjectTypeLabel('MonthlyBookkeeping')).toBe('기장대리');
  });
});

describe('getBillingModelLabel', () => {
  it('returns Korean label', () => {
    expect(getBillingModelLabel('Retainer')).toBe('정기 수임');
  });
});

describe('canChangeBillingModel', () => {
  it('allows Admin and Approver only', () => {
    expect(canChangeBillingModel('Admin')).toBe(true);
    expect(canChangeBillingModel('Approver')).toBe(true);
    expect(canChangeBillingModel('Preparer')).toBe(false);
  });
});

describe('buildProjectNameTemplate', () => {
  it('builds BookkeepingAgency name as 업무유형 only', () => {
    expect(buildProjectNameTemplate('BookkeepingAgency', {})).toBe('기장대리');
  });

  it('builds FilingAgency with fiscal period', () => {
    expect(
      buildProjectNameTemplate('FilingAgency', {
        workSubtype: 'CorpIncomeTax',
        fiscalYearStart: '2024-01-01',
        fiscalYearEnd: '2024-12-31',
      }),
    ).toBe('법인세 2024.01~2024.12');
  });

  it('builds TaxAmendment with attribution year', () => {
    expect(
      buildProjectNameTemplate('OtherWork', {
        workSubtype: 'TaxAmendment',
        eventDate: '2023-06-15',
      }),
    ).toBe('경정청구 2023귀속');
  });

  it('builds PropertyTaxFiling with subtype and event month', () => {
    expect(
      buildProjectNameTemplate('PropertyTaxFiling', {
        workSubtype: 'Transfer',
        eventDate: '2024-03-01',
      }),
    ).toBe('양도소득세 신고 2024.03');
  });
});

describe('isLongLivedProjectType', () => {
  it('returns true for long-lived types', () => {
    expect(isLongLivedProjectType('BookkeepingAgency')).toBe(true);
    expect(isLongLivedProjectType('OtherWork')).toBe(false);
  });
});
