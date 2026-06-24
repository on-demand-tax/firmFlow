import { normalizeLegacyProject, type ProjectType } from '@/lib/project-types';

export type BookkeepingActivityId =
  | 'VatFiling'
  | 'ExemptBusinessStatusReport'
  | 'SalesPurchaseVoucherEntry'
  | 'GeneralVoucherEntry'
  | 'WithholdingTaxReport'
  | 'PaymentStatementSubmission'
  | 'PayrollAndInsurance'
  | 'InformalReceiptVoucherEntry'
  | 'ClosingVoucherEntry';

export type NonBillableActivityId =
  | 'ADMIN_MEETING'
  | 'ADMIN_HR'
  | 'ADMIN_IT'
  | 'ADMIN_OFFICE'
  | 'RND_TAX_RESEARCH'
  | 'RND_TOOL_DEV'
  | 'RND_CASE_STUDY'
  | 'EDU_CPE'
  | 'EDU_OJT'
  | 'EDU_CERTIFICATION'
  | 'MKT_PROPOSAL'
  | 'MKT_NETWORKING'
  | 'MKT_CONTENT'
  | 'PTO_VACATION'
  | 'PTO_SICK'
  | 'PTO_LEAVE'
  | 'IDLE_BENCH'
  | 'IDLE_REWORK';

export type TimeLogActivityId = BookkeepingActivityId | NonBillableActivityId;

export interface ProjectActivityOption {
  id: TimeLogActivityId;
  label: string;
}

export interface ProjectActivityGroup {
  id: string;
  label: string;
  cadence?: string;
  activities: ProjectActivityOption[];
}

/** 기장대리(`BookkeepingAgency`) 타임로그 액티비티 — 회계·세무사무소 업무 구분 */
export const BOOKKEEPING_ACTIVITY_GROUPS: ProjectActivityGroup[] = [
  {
    id: 'VatFilingAndBookkeeping',
    label: '부가가치세 신고 및 기장',
    cadence: '분기(법인) / 반기(개인)',
    activities: [
      { id: 'VatFiling', label: '부가가치세 신고' },
      { id: 'ExemptBusinessStatusReport', label: '면세사업자 사업장현황신고' },
      {
        id: 'SalesPurchaseVoucherEntry',
        label: '매출·매입 전표 입력(세금계산서, 신용카드, 현금영수증)',
      },
      {
        id: 'GeneralVoucherEntry',
        label: '일반전표 입력(사업자통장)-법인대상/개인제외',
      },
    ],
  },
  {
    id: 'PayrollReporting',
    label: '인건비 신고',
    cadence: '매월/반기/연간',
    activities: [
      { id: 'WithholdingTaxReport', label: '원천징수이행상황 신고' },
      { id: 'PaymentStatementSubmission', label: '지급명세서 제출' },
      {
        id: 'PayrollAndInsurance',
        label: '급여대장작성, 4대보험관리(입·퇴사 신고포함)',
      },
    ],
  },
  {
    id: 'ClosingAndFinancialStatements',
    label: '결산 및 재무제표 작성',
    cadence: '연간/반기/분기',
    activities: [
      { id: 'InformalReceiptVoucherEntry', label: '간이영수증 등 전표입력' },
      { id: 'ClosingVoucherEntry', label: '결산전표 입력(감가상각비 등)' },
    ],
  },
];

/** 비청구 시간(`NonBillable`) 타임로그 액티비티 — [대분류-소분류] 구조 */
export const NON_BILLABLE_ACTIVITY_GROUPS: ProjectActivityGroup[] = [
  {
    id: 'Administration',
    label: '행정 및 일반 관리',
    activities: [
      { id: 'ADMIN_MEETING', label: '내부 회의 및 보고' },
      { id: 'ADMIN_HR', label: '인사 및 노무 관리' },
      { id: 'ADMIN_IT', label: 'IT 및 시스템 관리' },
      { id: 'ADMIN_OFFICE', label: '총무 및 출납' },
    ],
  },
  {
    id: 'ResearchDevelopment',
    label: '연구 및 개발',
    activities: [
      { id: 'RND_TAX_RESEARCH', label: '세법 및 회계기준 연구' },
      { id: 'RND_TOOL_DEV', label: '내부 도구 및 시스템 개발' },
      { id: 'RND_CASE_STUDY', label: '사례 분석' },
    ],
  },
  {
    id: 'Education',
    label: '교육 및 전문성 개발',
    activities: [
      { id: 'EDU_CPE', label: 'CPE(계속전문교육) 이수' },
      { id: 'EDU_OJT', label: '내부 교육(OJT)' },
      { id: 'EDU_CERTIFICATION', label: '자격증/학위 과정' },
    ],
  },
  {
    id: 'Marketing',
    label: '마케팅 및 영업',
    activities: [
      { id: 'MKT_PROPOSAL', label: '신규 제안서 작성' },
      { id: 'MKT_NETWORKING', label: '고객 상담 및 네트워킹' },
      { id: 'MKT_CONTENT', label: '콘텐츠 제작 및 홍보' },
    ],
  },
  {
    id: 'PaidTimeOff',
    label: '유급 휴가 및 공가',
    activities: [
      { id: 'PTO_VACATION', label: '연차 휴가' },
      { id: 'PTO_SICK', label: '병가' },
      { id: 'PTO_LEAVE', label: '경조사 휴가 및 공가' },
    ],
  },
  {
    id: 'IdleTime',
    label: '기타 비효율/유휴 시간',
    activities: [
      { id: 'IDLE_BENCH', label: '대기 시간 (Bench Time)' },
      { id: 'IDLE_REWORK', label: '단순 오류 수정 (Rework)' },
    ],
  },
];

const ACTIVITY_GROUPS_BY_TYPE: Partial<Record<ProjectType, ProjectActivityGroup[]>> = {
  BookkeepingAgency: BOOKKEEPING_ACTIVITY_GROUPS,
  NonBillable: NON_BILLABLE_ACTIVITY_GROUPS,
};

export function getActivityGroupsForProjectType(
  projectType: ProjectType | string,
): ProjectActivityGroup[] | null {
  const normalized = normalizeLegacyProject({ projectType: String(projectType) });
  return ACTIVITY_GROUPS_BY_TYPE[normalized.projectType] ?? null;
}

export function projectTypeRequiresActivity(projectType: ProjectType | string): boolean {
  return getActivityGroupsForProjectType(projectType) !== null;
}

export function isValidActivityForProjectType(
  projectType: ProjectType | string,
  activity: string,
): boolean {
  const groups = getActivityGroupsForProjectType(projectType);
  if (!groups) return false;
  return groups.some((group) => group.activities.some((a) => a.id === activity));
}

export function getActivityLabel(
  projectType: ProjectType | string,
  activityId: string,
): string | undefined {
  const groups = getActivityGroupsForProjectType(projectType);
  if (!groups) return undefined;
  for (const group of groups) {
    const found = group.activities.find((a) => a.id === activityId);
    if (found) return found.label;
  }
  return undefined;
}

export function isNonBillableProjectType(projectType: ProjectType | string): boolean {
  const normalized = normalizeLegacyProject({ projectType: String(projectType) });
  return normalized.projectType === 'NonBillable';
}
