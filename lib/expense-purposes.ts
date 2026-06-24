export type ExpensePurpose =
  | 'TaxAccountingSoftwareLicense'
  | 'ErpCollaborationSubscription'
  | 'DataInfoLookupFee'
  | 'TrainingEducation'
  | 'BooksPrintingSubscription'
  | 'AssociationRegistrationFee'
  | 'OfficeRent'
  | 'Telecommunications'
  | 'OfficeSupplies'
  | 'UtilitiesAndPublicCharges'
  | 'ClientEntertainment'
  | 'AdvertisingPromotion'
  | 'TravelTransport'
  | 'VehicleMaintenance'
  | 'EmployeeWelfare'
  | 'ExternalProfessionalFee';

export interface ExpensePurposeOption {
  id: ExpensePurpose;
  label: string;
  description?: string;
}

export interface ExpensePurposeGroup {
  id: string;
  label: string;
  purposes: ExpensePurposeOption[];
}

/** 회계·세무 사무소 지출 용도 (회계 계정과목 분류 기준) */
export const EXPENSE_PURPOSE_GROUPS: ExpensePurposeGroup[] = [
  {
    id: 'A',
    label: 'A. 프로그램 및 데이터 이용료',
    purposes: [
      {
        id: 'TaxAccountingSoftwareLicense',
        label: '세무/회계 프로그램 사용료',
        description: '더존(Smart A, WEHAGO), 세무사랑, 뉴젠 등 라이선스비',
      },
      {
        id: 'ErpCollaborationSubscription',
        label: 'ERP 및 협업툴 이용료',
        description: '메신저, 클라우드, Notion, 노무/인사 프로그램',
      },
      {
        id: 'DataInfoLookupFee',
        label: '데이터 및 정보 조회비',
        description: '고용·산재보험 조회, 등기부등본, 신용정보, AI 툴 구독료',
      },
    ],
  },
  {
    id: 'B',
    label: 'B. 인력 개발 및 전문성 유지비',
    purposes: [
      {
        id: 'TrainingEducation',
        label: '교육훈련비',
        description:
          '세무사회/공인회계사회 연수, 세법 세미나, 사내 직무 교육, 기타 직무관련 자격 취득',
      },
      {
        id: 'BooksPrintingSubscription',
        label: '도서인쇄비',
        description: '세법전, 교재, 전문 월간지 구독, 안내 책자 제작',
      },
      {
        id: 'AssociationRegistrationFee',
        label: '협회비 및 등록비',
        description: 'KICPA·세무사회 협회비, 등록 갱신 수수료',
      },
    ],
  },
  {
    id: 'C',
    label: 'C. 사무실 운영 및 고정비',
    purposes: [
      { id: 'OfficeRent', label: '지급임차료', description: '사무실 월세, 관리비' },
      {
        id: 'Telecommunications',
        label: '통신비',
        description: '인터넷, 팩스, 인터넷 전화, SMS/알림톡 이용료',
      },
      {
        id: 'OfficeSupplies',
        label: '소모품비 / 사무용품비',
        description: '복사지, 토너, 문구류, 탕비실 다과·커피',
      },
      {
        id: 'UtilitiesAndPublicCharges',
        label: '수도광열비 / 세금과공과',
        description: '전기세, 수도세, 수수료 성격의 세금',
      },
    ],
  },
  {
    id: 'D',
    label: 'D. 영업 및 고객 관리',
    purposes: [
      {
        id: 'ClientEntertainment',
        label: '기업업무추진비 (접대비)',
        description: '수임업체 미팅 식대, 명절 선물, 경조사비(화환·축의금)',
      },
      {
        id: 'AdvertisingPromotion',
        label: '광고선전비',
        description: '홈페이지, 블로그/유튜브, 리플렛, 키워드 광고',
      },
    ],
  },
  {
    id: 'E',
    label: 'E. 출장 및 이동 비용',
    purposes: [
      {
        id: 'TravelTransport',
        label: '여비교통비',
        description: '세무조사 대응·현장 실사 출장, 주차비, KTX/택시',
      },
      {
        id: 'VehicleMaintenance',
        label: '차량유지비',
        description: '업무용 차량 주유비, 하이패스, 보험료, 정비비',
      },
    ],
  },
  {
    id: 'F',
    label: 'F. 인건비 및 복리후생',
    purposes: [
      {
        id: 'EmployeeWelfare',
        label: '복리후생비',
        description: '직원 식대, 야근 식대(신고 기간), 간식비, 직원 경조사비',
      },
      {
        id: 'ExternalProfessionalFee',
        label: '지급수수료 (기타)',
        description: '외부 전문가(감평사, 법무사 등) 자문료, 노무비',
      },
    ],
  },
];

export const EXPENSE_PURPOSES: ExpensePurpose[] = EXPENSE_PURPOSE_GROUPS.flatMap((group) =>
  group.purposes.map((purpose) => purpose.id),
);

const PURPOSE_LABELS: Record<ExpensePurpose, string> = Object.fromEntries(
  EXPENSE_PURPOSE_GROUPS.flatMap((group) =>
    group.purposes.map((purpose) => [purpose.id, purpose.label]),
  ),
) as Record<ExpensePurpose, string>;

export function getExpensePurposeLabel(id: ExpensePurpose): string {
  return PURPOSE_LABELS[id];
}

export function parseExpensePurpose(value: unknown): ExpensePurpose | null {
  if (typeof value !== 'string') return null;
  return EXPENSE_PURPOSES.includes(value as ExpensePurpose) ? (value as ExpensePurpose) : null;
}

export function formatPurposeOptionLabel(purpose: ExpensePurposeOption): string {
  return purpose.description ? `${purpose.label} — ${purpose.description}` : purpose.label;
}
