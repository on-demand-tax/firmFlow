export type ProjectType =
  | 'General'
  | 'FeeCycleAdmin'
  | 'BookkeepingAgency'
  | 'FilingAgency'
  | 'PropertyTaxFiling'
  | 'ExternalAudit'
  | 'Consulting'
  | 'BusinessDiagnosis'
  | 'TaxAuditRepresentation'
  | 'OtherWork'
  | 'NonBillable';

/** @deprecated DB 마이그레이션 전 레거시 값 — 읽기 시 normalizeLegacyProject 사용 */
export type LegacyProjectType =
  | 'MonthlyBookkeeping'
  | 'AnnualTaxAdjustment'
  | 'EstateGiftTransferTax'
  | 'TaxAmendment'
  | 'TaxConsulting'
  | 'Audit'
  | 'AdHoc';

export type WorkSubtype =
  | 'GeneralBookkeeping'
  | 'VatFiling'
  | 'WithholdingFiling'
  | 'PayrollAgency'
  | 'VoucherEntry'
  | 'AccountingSettlement'
  | 'CorpIncomeTax'
  | 'ComprehensiveIncomeTax'
  | 'VatTaxable'
  | 'BusinessStatusReport'
  | 'Inheritance'
  | 'Gift'
  | 'Transfer'
  | 'SecuritiesTransaction'
  | 'ConstructionLicenseCapital'
  | 'Other'
  | 'BusinessRegistration'
  | 'LoanDocuments'
  | 'TaxAmendment'
  | 'TaxAppeal';

export type BillingModel =
  | 'Hourly'
  | 'Retainer'
  | 'FixedPerEvent'
  | 'BasePlusSuccess'
  | 'PerFiscalPeriod'
  | 'Manual';

export type BillingCycle =
  | 'Monthly'
  | 'Quarterly'
  | 'SemiAnnual'
  | 'Annual'
  | 'OnCompletion';

export type ProjectCurrency = 'KRW' | 'USD';
export type UserRole = 'Admin' | 'Approver' | 'Preparer';
export type ProjectLifespan = 'long-lived' | 'per-event' | 'per-fiscal-period' | 'flexible';

export type ProjectFieldKey =
  | 'billingCycle'
  | 'currency'
  | 'contractAmount'
  | 'billingAnchorDay'
  | 'fiscalYearStart'
  | 'fiscalYearEnd'
  | 'workSubtype'
  | 'eventDate'
  | 'baseFeeAmount'
  | 'successFeeRate'
  | 'hourlyRate'
  | 'notes';

export interface WorkSubtypeDefinition {
  label: string;
  defaultBillingModel?: BillingModel;
}

export interface NameTemplateContext {
  workSubtype?: WorkSubtype;
  fiscalYearStart?: string | Date;
  fiscalYearEnd?: string | Date;
  eventDate?: string | Date;
  engagementTitle?: string;
}

export interface ProjectTypeDefinition {
  label: string;
  defaultBillingModel: BillingModel;
  defaultBillingCycle?: BillingCycle;
  requiredFields: ProjectFieldKey[];
  requiresWorkSubtype: boolean;
  workSubtypes?: Partial<Record<WorkSubtype, WorkSubtypeDefinition>>;
  lifespan: ProjectLifespan;
  nameTemplate: (ctx: NameTemplateContext) => string;
  phase2BillingKey?: string;
  /** 시스템이 자동 생성·관리하며 사용자가 수동 등록할 수 없음 */
  systemManaged?: boolean;
}

export const PROJECT_TYPES: ProjectType[] = [
  'General',
  'FeeCycleAdmin',
  'BookkeepingAgency',
  'FilingAgency',
  'PropertyTaxFiling',
  'ExternalAudit',
  'Consulting',
  'BusinessDiagnosis',
  'TaxAuditRepresentation',
  'OtherWork',
  'NonBillable',
];

export const LEGACY_PROJECT_TYPES: LegacyProjectType[] = [
  'MonthlyBookkeeping',
  'AnnualTaxAdjustment',
  'EstateGiftTransferTax',
  'TaxAmendment',
  'TaxConsulting',
  'Audit',
  'AdHoc',
];

export const BILLING_MODELS: BillingModel[] = [
  'Hourly',
  'Retainer',
  'FixedPerEvent',
  'BasePlusSuccess',
  'PerFiscalPeriod',
  'Manual',
];

const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  Hourly: '시간당',
  Retainer: '정기 수임',
  FixedPerEvent: '건당 정액',
  BasePlusSuccess: '기본금+성공보수',
  PerFiscalPeriod: '회계기간당',
  Manual: '수동(혼합)',
};

const BOOKKEEPING_SUBTYPES: ProjectTypeDefinition['workSubtypes'] = {
  GeneralBookkeeping: { label: '통합 기장대리' },
  VatFiling: { label: '부가가치세신고' },
  WithholdingFiling: { label: '원천징수·지급명세서' },
  PayrollAgency: { label: '인건비 대행' },
  VoucherEntry: { label: '회계전표·장부작성' },
  AccountingSettlement: { label: '회계결산' },
};

const FILING_SUBTYPES: ProjectTypeDefinition['workSubtypes'] = {
  CorpIncomeTax: { label: '법인세' },
  ComprehensiveIncomeTax: { label: '종합소득세' },
  VatTaxable: { label: '부가가치세(과세)' },
  BusinessStatusReport: { label: '사업장현황신고' },
};

const PROPERTY_SUBTYPES: ProjectTypeDefinition['workSubtypes'] = {
  Inheritance: { label: '상속세' },
  Gift: { label: '증여세' },
  Transfer: { label: '양도소득세' },
  SecuritiesTransaction: { label: '증권거래세' },
};

const DIAGNOSIS_SUBTYPES: ProjectTypeDefinition['workSubtypes'] = {
  ConstructionLicenseCapital: { label: '건설업 면허 적격자본금' },
  Other: { label: '기타 진단' },
};

const OTHER_WORK_SUBTYPES: ProjectTypeDefinition['workSubtypes'] = {
  BusinessRegistration: { label: '사업자등록신청', defaultBillingModel: 'FixedPerEvent' },
  LoanDocuments: { label: '대출서류·증명서류', defaultBillingModel: 'FixedPerEvent' },
  TaxAmendment: { label: '경정청구', defaultBillingModel: 'BasePlusSuccess' },
  TaxAppeal: { label: '조세불복', defaultBillingModel: 'Hourly' },
};

function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const s = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(s);
}

function fiscalYearFromDate(value: string | Date | undefined): string {
  if (!value) return '';
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

function formatYearMonth(value: string | Date | undefined): string {
  if (!value) return '';
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function composeProjectName(workType: string, period?: string): string {
  return [workType.trim(), period?.trim()].filter(Boolean).join(' ');
}

function formatFiscalPeriod(ctx: NameTemplateContext): string {
  const start = formatYearMonth(ctx.fiscalYearStart);
  const end = formatYearMonth(ctx.fiscalYearEnd);
  if (start && end) return `${start}~${end}`;
  const year = fiscalYearFromDate(ctx.fiscalYearEnd ?? ctx.fiscalYearStart);
  return year ? `${year}사업연도` : '';
}

function formatAttributionPeriod(ctx: NameTemplateContext): string {
  const year = fiscalYearFromDate(ctx.eventDate ?? ctx.fiscalYearEnd);
  return year ? `${year}귀속` : '';
}

function workTypeLabel(
  projectType: ProjectType,
  ctx: NameTemplateContext,
  fallback: string,
): string {
  if (ctx.workSubtype) {
    const label = getWorkSubtypeLabel(projectType, ctx.workSubtype);
    if (label) return label;
  }
  return fallback;
}

export const PROJECT_TYPE_REGISTRY: Record<ProjectType, ProjectTypeDefinition> = {
  General: {
    label: '일반',
    defaultBillingModel: 'Hourly',
    requiredFields: [],
    requiresWorkSubtype: false,
    lifespan: 'flexible',
    nameTemplate: (ctx) => composeProjectName('일반', ctx.engagementTitle),
  },
  FeeCycleAdmin: {
    label: '수수료청구 관리',
    defaultBillingModel: 'Retainer',
    requiredFields: ['billingCycle', 'currency'],
    requiresWorkSubtype: false,
    lifespan: 'long-lived',
    nameTemplate: (ctx) => composeProjectName('수수료청구 관리'),
    phase2BillingKey: 'retainer-cycle',
  },
  BookkeepingAgency: {
    label: '기장대리',
    defaultBillingModel: 'Retainer',
    defaultBillingCycle: 'Monthly',
    requiredFields: ['contractAmount', 'currency', 'billingAnchorDay'],
    requiresWorkSubtype: false,
    workSubtypes: BOOKKEEPING_SUBTYPES,
    lifespan: 'long-lived',
    nameTemplate: (ctx) =>
      composeProjectName(workTypeLabel('BookkeepingAgency', ctx, '기장대리')),
    phase2BillingKey: 'retainer-monthly',
  },
  FilingAgency: {
    label: '신고대리',
    defaultBillingModel: 'Retainer',
    defaultBillingCycle: 'Annual',
    requiredFields: [
      'workSubtype',
      'fiscalYearStart',
      'fiscalYearEnd',
      'contractAmount',
      'currency',
    ],
    requiresWorkSubtype: true,
    workSubtypes: FILING_SUBTYPES,
    lifespan: 'per-fiscal-period',
    nameTemplate: (ctx) =>
      composeProjectName(
        workTypeLabel('FilingAgency', ctx, '신고대리'),
        formatFiscalPeriod(ctx),
      ),
    phase2BillingKey: 'retainer-annual',
  },
  PropertyTaxFiling: {
    label: '재산제세 신고대리',
    defaultBillingModel: 'FixedPerEvent',
    requiredFields: ['workSubtype', 'eventDate', 'contractAmount', 'currency'],
    requiresWorkSubtype: true,
    workSubtypes: PROPERTY_SUBTYPES,
    lifespan: 'per-event',
    nameTemplate: (ctx) => {
      const subtype = ctx.workSubtype
        ? `${getWorkSubtypeLabel('PropertyTaxFiling', ctx.workSubtype)} 신고`
        : '신고';
      return composeProjectName(subtype, formatYearMonth(ctx.eventDate));
    },
  },
  ExternalAudit: {
    label: '외부감사',
    defaultBillingModel: 'PerFiscalPeriod',
    requiredFields: ['fiscalYearStart', 'fiscalYearEnd', 'contractAmount', 'currency'],
    requiresWorkSubtype: false,
    lifespan: 'per-fiscal-period',
    nameTemplate: (ctx) =>
      composeProjectName('외부감사', formatFiscalPeriod(ctx)),
    phase2BillingKey: 'per-fiscal-period',
  },
  Consulting: {
    label: '상담 및 자문',
    defaultBillingModel: 'Hourly',
    requiredFields: ['currency'],
    requiresWorkSubtype: false,
    lifespan: 'flexible',
    nameTemplate: (ctx) =>
      composeProjectName(
        '상담 및 자문',
        formatYearMonth(ctx.eventDate) || ctx.engagementTitle,
      ),
  },
  BusinessDiagnosis: {
    label: '기업진단',
    defaultBillingModel: 'FixedPerEvent',
    requiredFields: ['workSubtype', 'contractAmount', 'currency'],
    requiresWorkSubtype: true,
    workSubtypes: DIAGNOSIS_SUBTYPES,
    lifespan: 'per-event',
    nameTemplate: (ctx) =>
      composeProjectName(
        workTypeLabel('BusinessDiagnosis', ctx, '기업진단'),
        formatYearMonth(ctx.eventDate),
      ),
  },
  TaxAuditRepresentation: {
    label: '세무조사대리',
    defaultBillingModel: 'Hourly',
    requiredFields: ['currency'],
    requiresWorkSubtype: false,
    lifespan: 'per-event',
    nameTemplate: (ctx) =>
      composeProjectName('세무조사대리', formatYearMonth(ctx.eventDate)),
  },
  OtherWork: {
    label: '기타업무',
    defaultBillingModel: 'FixedPerEvent',
    requiredFields: ['workSubtype'],
    requiresWorkSubtype: true,
    workSubtypes: OTHER_WORK_SUBTYPES,
    lifespan: 'per-event',
    nameTemplate: (ctx) =>
      composeProjectName(
        workTypeLabel('OtherWork', ctx, '기타업무'),
        ctx.workSubtype === 'TaxAmendment'
          ? formatAttributionPeriod(ctx)
          : formatYearMonth(ctx.eventDate),
      ),
  },
  NonBillable: {
    label: '비청구 시간',
    defaultBillingModel: 'Manual',
    requiredFields: [],
    requiresWorkSubtype: false,
    lifespan: 'long-lived',
    nameTemplate: () => '비청구 시간',
    systemManaged: true,
  },
};

const LEGACY_TYPE_MAP: Record<
  LegacyProjectType,
  { projectType: ProjectType; workSubtype?: WorkSubtype }
> = {
  MonthlyBookkeeping: { projectType: 'BookkeepingAgency', workSubtype: 'GeneralBookkeeping' },
  AnnualTaxAdjustment: { projectType: 'FilingAgency', workSubtype: 'CorpIncomeTax' },
  EstateGiftTransferTax: { projectType: 'PropertyTaxFiling' },
  TaxAmendment: { projectType: 'OtherWork', workSubtype: 'TaxAmendment' },
  TaxConsulting: { projectType: 'Consulting' },
  Audit: { projectType: 'ExternalAudit' },
  AdHoc: { projectType: 'OtherWork', workSubtype: 'Other' },
};

const LEGACY_FILING_MAP: Record<string, WorkSubtype> = {
  Transfer: 'Transfer',
  Gift: 'Gift',
  Inheritance: 'Inheritance',
};

const LEGACY_ENGAGEMENT_MAP: Record<string, WorkSubtype> = {
  BusinessDiagnosis: 'ConstructionLicenseCapital',
  NPL: 'Other',
  SubsidySettlement: 'Other',
  Lecture: 'Other',
  BookWriting: 'Other',
  Other: 'Other',
};

export function isLegacyProjectType(value: string): value is LegacyProjectType {
  return (LEGACY_PROJECT_TYPES as string[]).includes(value);
}

export function normalizeLegacyProject(record: {
  projectType: string;
  workSubtype?: string;
  filingSubtype?: string;
  engagementSubtype?: string;
}): { projectType: ProjectType; workSubtype?: WorkSubtype } {
  if (PROJECT_TYPES.includes(record.projectType as ProjectType)) {
    return {
      projectType: record.projectType as ProjectType,
      workSubtype: record.workSubtype as WorkSubtype | undefined,
    };
  }

  if (isLegacyProjectType(record.projectType)) {
    const mapped = LEGACY_TYPE_MAP[record.projectType];
    let workSubtype = mapped.workSubtype ?? (record.workSubtype as WorkSubtype | undefined);

    if (record.projectType === 'EstateGiftTransferTax' && record.filingSubtype) {
      workSubtype = LEGACY_FILING_MAP[record.filingSubtype] ?? workSubtype;
    }
    if (record.projectType === 'AdHoc' && record.engagementSubtype) {
      if (record.engagementSubtype === 'BusinessDiagnosis') {
        return { projectType: 'BusinessDiagnosis', workSubtype: 'ConstructionLicenseCapital' };
      }
      workSubtype = LEGACY_ENGAGEMENT_MAP[record.engagementSubtype] ?? 'Other';
    }

    return { projectType: mapped.projectType, workSubtype };
  }

  return { projectType: 'General' };
}

export function getWorkSubtypesForType(
  projectType: ProjectType,
): Array<{ id: WorkSubtype; label: string; defaultBillingModel?: BillingModel }> {
  const def = PROJECT_TYPE_REGISTRY[projectType];
  if (!def.workSubtypes) return [];
  return Object.entries(def.workSubtypes).map(([id, meta]) => ({
    id: id as WorkSubtype,
    label: meta.label,
    defaultBillingModel: meta.defaultBillingModel,
  }));
}

export function isValidWorkSubtype(
  projectType: ProjectType,
  workSubtype: unknown,
): workSubtype is WorkSubtype {
  if (typeof workSubtype !== 'string') return false;
  const def = PROJECT_TYPE_REGISTRY[projectType];
  return Boolean(def.workSubtypes?.[workSubtype as WorkSubtype]);
}

export function getWorkSubtypeLabel(
  projectType: ProjectType,
  workSubtype: WorkSubtype,
): string {
  return PROJECT_TYPE_REGISTRY[projectType].workSubtypes?.[workSubtype]?.label ?? workSubtype;
}

export interface BillingDefaults {
  billingModel: BillingModel;
  billingCycle?: BillingCycle;
}

export function deriveBillingDefaults(
  projectType: ProjectType,
  workSubtype?: WorkSubtype,
): BillingDefaults {
  const def = PROJECT_TYPE_REGISTRY[projectType];
  let billingModel = def.defaultBillingModel;

  if (workSubtype && def.workSubtypes?.[workSubtype]?.defaultBillingModel) {
    billingModel = def.workSubtypes[workSubtype]!.defaultBillingModel!;
  }

  return {
    billingModel,
    ...(def.defaultBillingCycle ? { billingCycle: def.defaultBillingCycle } : {}),
  };
}

export function getProjectTypeLabel(projectType: ProjectType | string): string {
  const normalized = normalizeLegacyProject({ projectType });
  return PROJECT_TYPE_REGISTRY[normalized.projectType].label;
}

export function getBillingModelLabel(billingModel: BillingModel): string {
  return BILLING_MODEL_LABELS[billingModel];
}

export function canChangeBillingModel(role: UserRole): boolean {
  return role === 'Admin' || role === 'Approver';
}

export function isLongLivedProjectType(projectType: ProjectType | string): boolean {
  const normalized = normalizeLegacyProject({ projectType });
  return PROJECT_TYPE_REGISTRY[normalized.projectType].lifespan === 'long-lived';
}

export function getUserSelectableProjectTypes(): ProjectType[] {
  return PROJECT_TYPES.filter((id) => !PROJECT_TYPE_REGISTRY[id].systemManaged);
}

export function buildProjectNameTemplate(
  projectType: ProjectType | string,
  ctx: NameTemplateContext,
): string {
  const normalized = normalizeLegacyProject({
    projectType,
    workSubtype: ctx.workSubtype,
  });
  return PROJECT_TYPE_REGISTRY[normalized.projectType].nameTemplate({
    ...ctx,
    workSubtype: normalized.workSubtype ?? ctx.workSubtype,
  });
}

export interface ValidateProjectOptions {
  isPatch: boolean;
  userRole: UserRole;
  existing?: Partial<ValidatedProjectData> & {
    projectType?: ProjectType | string;
    billingModel?: BillingModel;
  };
}

export type ProjectPayloadInput = Record<string, unknown>;

export type ValidatedProjectData = {
  clientId?: string;
  projectName?: string;
  projectType: ProjectType;
  workSubtype?: WorkSubtype;
  billingModel: BillingModel;
  status?: 'Active' | 'Completed';
  billingCycle?: BillingCycle;
  currency: ProjectCurrency;
  contractAmount?: number;
  baseFeeAmount?: number;
  successFeeRate?: number;
  hourlyRate?: number;
  eventDate?: Date;
  fiscalYearStart?: Date;
  fiscalYearEnd?: Date;
  billingAnchorDay?: number;
  notes?: string;
};

type ValidateSuccess = { ok: true; data: ValidatedProjectData };
type ValidateFailure = { ok: false; error: string; status: number };

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === 'string' && PROJECT_TYPES.includes(value as ProjectType);
}

function isBillingModel(value: unknown): value is BillingModel {
  return typeof value === 'string' && BILLING_MODELS.includes(value as BillingModel);
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function fieldLabel(field: ProjectFieldKey): string {
  const labels: Record<ProjectFieldKey, string> = {
    billingCycle: '청구 주기',
    currency: '통화',
    contractAmount: '계약 금액',
    billingAnchorDay: '청구 기준일',
    fiscalYearStart: '사업연도 시작',
    fiscalYearEnd: '사업연도 종료',
    workSubtype: '세부 업무',
    eventDate: '기준일',
    baseFeeAmount: '기본금',
    successFeeRate: '성공보수율',
    hourlyRate: '시간당 단가',
    notes: '메모',
  };
  return labels[field];
}

function resolveWorkSubtype(
  body: ProjectPayloadInput,
  projectType: ProjectType,
  existing?: Partial<ValidatedProjectData>,
): WorkSubtype | undefined {
  if (hasValue(body.workSubtype) && isValidWorkSubtype(projectType, body.workSubtype)) {
    return body.workSubtype as WorkSubtype;
  }
  if (existing?.workSubtype) return existing.workSubtype;
  if (body.filingSubtype && projectType === 'PropertyTaxFiling') {
    const mapped = LEGACY_FILING_MAP[String(body.filingSubtype)];
    if (mapped) return mapped;
  }
  if (body.engagementSubtype && projectType === 'OtherWork') {
    const mapped = LEGACY_ENGAGEMENT_MAP[String(body.engagementSubtype)];
    if (mapped) return mapped;
  }
  if (body.projectType !== undefined && isLegacyProjectType(String(body.projectType))) {
    const normalized = normalizeLegacyProject({
      projectType: String(body.projectType),
      filingSubtype: String(body.filingSubtype ?? ''),
      engagementSubtype: String(body.engagementSubtype ?? ''),
    });
    if (
      normalized.workSubtype &&
      isValidWorkSubtype(projectType, normalized.workSubtype)
    ) {
      return normalized.workSubtype;
    }
  }
  return undefined;
}

function isTaxAmendment(
  projectType: ProjectType,
  workSubtype?: WorkSubtype,
): boolean {
  return projectType === 'OtherWork' && workSubtype === 'TaxAmendment';
}

export function validateProjectPayload(
  body: ProjectPayloadInput,
  options: ValidateProjectOptions,
): ValidateSuccess | ValidateFailure {
  const { isPatch, userRole, existing } = options;

  let projectType: ProjectType;
  if (isProjectType(body.projectType)) {
    projectType = body.projectType;
  } else if (body.projectType !== undefined && isLegacyProjectType(String(body.projectType))) {
    projectType = normalizeLegacyProject({ projectType: String(body.projectType) }).projectType;
  } else if (existing?.projectType) {
    projectType = normalizeLegacyProject({ projectType: String(existing.projectType) }).projectType;
  } else {
    projectType = 'General';
  }

  if (!isPatch && !hasValue(body.clientId)) {
    return { ok: false, error: '필수 항목을 입력해 주세요', status: 400 };
  }
  if (!isPatch && !hasValue(body.projectName)) {
    return { ok: false, error: '필수 항목을 입력해 주세요', status: 400 };
  }
  if (!isPatch && !hasValue(body.projectType)) {
    return { ok: false, error: '필수 항목을 입력해 주세요', status: 400 };
  }
  if (
    body.projectType !== undefined &&
    !isProjectType(body.projectType) &&
    !isLegacyProjectType(String(body.projectType))
  ) {
    return { ok: false, error: '유효하지 않은 값입니다', status: 400 };
  }

  const workSubtype = resolveWorkSubtype(body, projectType, existing);
  const typeDef = PROJECT_TYPE_REGISTRY[projectType];

  if (!isPatch && typeDef.systemManaged) {
    return { ok: false, error: '시스템 관리 프로젝트 유형은 직접 생성할 수 없습니다', status: 400 };
  }

  if (!isPatch && typeDef.requiresWorkSubtype && !workSubtype) {
    return { ok: false, error: '세부 업무가 필요합니다', status: 400 };
  }
  if (workSubtype && !isValidWorkSubtype(projectType, workSubtype)) {
    return { ok: false, error: '유효하지 않은 값입니다', status: 400 };
  }

  const defaults = deriveBillingDefaults(projectType, workSubtype);
  const requestedBillingModel = isBillingModel(body.billingModel)
    ? body.billingModel
    : undefined;
  const effectiveBillingModel =
    requestedBillingModel ?? existing?.billingModel ?? defaults.billingModel;

  if (
    requestedBillingModel !== undefined &&
    requestedBillingModel !== defaults.billingModel &&
    !canChangeBillingModel(userRole)
  ) {
    return { ok: false, error: '청구 모델 변경 권한이 없습니다', status: 403 };
  }

  const currency: ProjectCurrency =
    body.currency === 'USD' || body.currency === 'KRW' ? body.currency : 'KRW';

  const contractAmount = parseOptionalNumber(body.contractAmount);
  const baseFeeAmount = parseOptionalNumber(body.baseFeeAmount);
  const successFeeRate = parseOptionalNumber(body.successFeeRate);
  const hourlyRate = parseOptionalNumber(body.hourlyRate);
  const billingAnchorDay = parseOptionalNumber(body.billingAnchorDay);

  for (const value of [contractAmount, baseFeeAmount, hourlyRate]) {
    if (value !== undefined && (Number.isNaN(value) || value < 0)) {
      return { ok: false, error: '금액은 0 이상이어야 합니다', status: 400 };
    }
  }

  if (
    successFeeRate !== undefined &&
    (Number.isNaN(successFeeRate) || successFeeRate < 0 || successFeeRate > 100)
  ) {
    return { ok: false, error: '유효하지 않은 값입니다', status: 400 };
  }

  const fiscalYearStart = parseOptionalDate(body.fiscalYearStart);
  const fiscalYearEnd = parseOptionalDate(body.fiscalYearEnd);
  if (fiscalYearStart && fiscalYearEnd && fiscalYearStart > fiscalYearEnd) {
    return { ok: false, error: '유효하지 않은 값입니다', status: 400 };
  }

  const billingCycle =
    typeof body.billingCycle === 'string'
      ? (body.billingCycle as BillingCycle)
      : defaults.billingCycle;

  if (
    billingAnchorDay !== undefined &&
    (Number.isNaN(billingAnchorDay) || billingAnchorDay < 1 || billingAnchorDay > 28)
  ) {
    return { ok: false, error: '유효하지 않은 값입니다', status: 400 };
  }

  const merged: Record<string, unknown> = {
    billingCycle: body.billingCycle ?? existing?.billingCycle ?? defaults.billingCycle,
    currency: body.currency ?? existing?.currency ?? currency,
    contractAmount:
      body.contractAmount !== undefined ? contractAmount : existing?.contractAmount,
    billingAnchorDay:
      body.billingAnchorDay !== undefined ? billingAnchorDay : existing?.billingAnchorDay,
    fiscalYearStart:
      body.fiscalYearStart !== undefined ? fiscalYearStart : existing?.fiscalYearStart,
    fiscalYearEnd: body.fiscalYearEnd !== undefined ? fiscalYearEnd : existing?.fiscalYearEnd,
    workSubtype,
    eventDate:
      body.eventDate !== undefined ? parseOptionalDate(body.eventDate) : existing?.eventDate,
    baseFeeAmount:
      body.baseFeeAmount !== undefined ? baseFeeAmount : existing?.baseFeeAmount,
    successFeeRate:
      body.successFeeRate !== undefined ? successFeeRate : existing?.successFeeRate,
    hourlyRate: body.hourlyRate !== undefined ? hourlyRate : existing?.hourlyRate,
    notes: body.notes ?? existing?.notes,
  };

  const validateRequired = !isPatch || body.projectType !== undefined;

  if (validateRequired) {
    for (const field of typeDef.requiredFields) {
      if (!hasValue(merged[field])) {
        if (isTaxAmendment(projectType, workSubtype) && (field === 'baseFeeAmount' || field === 'successFeeRate')) {
          return {
            ok: false,
            error: '경정청구는 기본금과 성공보수율이 필요합니다',
            status: 400,
          };
        }
        return {
          ok: false,
          error: `${fieldLabel(field)}이(가) 필요합니다`,
          status: 400,
        };
      }
    }

    if (projectType === 'OtherWork' && workSubtype === 'LoanDocuments') {
      const hasContract =
        merged.contractAmount !== undefined && !Number.isNaN(Number(merged.contractAmount));
      const hasHourly =
        merged.hourlyRate !== undefined && !Number.isNaN(Number(merged.hourlyRate));
      if (!hasContract && !hasHourly) {
        return {
          ok: false,
          error: '계약 금액 또는 시간당 단가 중 하나가 필요합니다',
          status: 400,
        };
      }
    }
  }

  const effectiveBaseFee =
    baseFeeAmount !== undefined ? baseFeeAmount : existing?.baseFeeAmount;
  const effectiveSuccessRate =
    successFeeRate !== undefined ? successFeeRate : existing?.successFeeRate;

  if (
    (isTaxAmendment(projectType, workSubtype) ||
      effectiveBillingModel === 'BasePlusSuccess') &&
    !isPatch &&
    validateRequired &&
    (effectiveBaseFee === undefined || effectiveSuccessRate === undefined)
  ) {
    return {
      ok: false,
      error: '경정청구는 기본금과 성공보수율이 필요합니다',
      status: 400,
    };
  }

  const data: ValidatedProjectData = {
    projectType,
    workSubtype,
    billingModel: effectiveBillingModel,
    currency,
  };

  if (hasValue(body.clientId)) data.clientId = String(body.clientId);
  if (hasValue(body.projectName)) data.projectName = String(body.projectName).trim();
  if (body.status === 'Active' || body.status === 'Completed') data.status = body.status;
  if (billingCycle) data.billingCycle = billingCycle;
  if (contractAmount !== undefined && !Number.isNaN(contractAmount)) {
    data.contractAmount = contractAmount;
  }
  if (baseFeeAmount !== undefined && !Number.isNaN(baseFeeAmount)) {
    data.baseFeeAmount = baseFeeAmount;
  }
  if (successFeeRate !== undefined && !Number.isNaN(successFeeRate)) {
    data.successFeeRate = successFeeRate;
  }
  if (hourlyRate !== undefined && !Number.isNaN(hourlyRate)) {
    data.hourlyRate = hourlyRate;
  }
  const eventDate = parseOptionalDate(body.eventDate);
  if (eventDate) data.eventDate = eventDate;
  if (fiscalYearStart) data.fiscalYearStart = fiscalYearStart;
  if (fiscalYearEnd) data.fiscalYearEnd = fiscalYearEnd;
  if (billingAnchorDay !== undefined && !Number.isNaN(billingAnchorDay)) {
    data.billingAnchorDay = billingAnchorDay;
  }
  if (hasValue(body.notes)) data.notes = String(body.notes);

  return { ok: true, data };
}

export function getDuplicateWarningMessage(projectType: ProjectType | string): string {
  const label = getProjectTypeLabel(projectType);
  return `동일 고객에 활성 ${label} 프로젝트가 이미 있습니다`;
}
