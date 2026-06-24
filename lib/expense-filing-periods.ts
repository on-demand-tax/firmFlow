export type ExpenseFilingPeriod =
  | 'CorpIncomeTaxMarch'
  | 'IndividualIncomeTaxMay'
  | 'VatFilingJanuaryJuly'
  | 'YearEndClosing'
  | 'OtherPeakSeason';

export interface ExpenseFilingPeriodOption {
  id: ExpenseFilingPeriod;
  label: string;
}

/** 신고 기간 태그 — 시즌별 원가 분석용 (선택) */
export const EXPENSE_FILING_PERIODS: ExpenseFilingPeriodOption[] = [
  { id: 'CorpIncomeTaxMarch', label: '3월 (법인세)' },
  { id: 'IndividualIncomeTaxMay', label: '5월 (종합소득세)' },
  { id: 'VatFilingJanuaryJuly', label: '1·7월 (부가가치세)' },
  { id: 'YearEndClosing', label: '연말 결산·마감' },
  { id: 'OtherPeakSeason', label: '기타 신고·업무 성수기' },
];

const FILING_PERIOD_LABELS: Record<ExpenseFilingPeriod, string> = Object.fromEntries(
  EXPENSE_FILING_PERIODS.map((period) => [period.id, period.label]),
) as Record<ExpenseFilingPeriod, string>;

export function getExpenseFilingPeriodLabel(id: ExpenseFilingPeriod): string {
  return FILING_PERIOD_LABELS[id];
}

export function parseExpenseFilingPeriod(value: unknown): ExpenseFilingPeriod | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  return EXPENSE_FILING_PERIODS.some((period) => period.id === value)
    ? (value as ExpenseFilingPeriod)
    : null;
}
