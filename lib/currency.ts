export type ExpenseCurrency = 'KRW' | 'USD';

export const EXPENSE_CURRENCIES: ExpenseCurrency[] = ['KRW', 'USD'];

export interface CurrencyTotals {
  KRW: number;
  USD: number;
}

export function emptyCurrencyTotals(): CurrencyTotals {
  return { KRW: 0, USD: 0 };
}

export function addToCurrencyTotals(
  totals: CurrencyTotals,
  currency: ExpenseCurrency,
  amount: number,
): void {
  totals[currency] += amount;
}

export function formatMoney(amount: number, currency: ExpenseCurrency): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

export function formatCurrencyTotals(totals: CurrencyTotals): string {
  return `${formatMoney(totals.KRW, 'KRW')} / ${formatMoney(totals.USD, 'USD')}`;
}

/** 금액 입력 필드용 — 입력 중 천 단위 콤마 표시 */
export function formatAmountInput(
  value: string,
  currency: ExpenseCurrency = 'KRW',
): string {
  if (!value) return '';

  if (currency === 'USD') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    const intRaw = dotIndex >= 0 ? cleaned.slice(0, dotIndex) : cleaned;
    const decRaw =
      dotIndex >= 0
        ? cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2)
        : '';
    const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (dotIndex >= 0) {
      return decRaw.length > 0 ? `${intFormatted}.${decRaw}` : `${intFormatted}.`;
    }
    return intFormatted;
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseAmountInput(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '.') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function formatAmountFromNumber(
  amount: number,
  currency: ExpenseCurrency = 'KRW',
): string {
  if (currency === 'USD') {
    const [intPart, decPart] = amount.toString().split('.');
    const formatted = formatAmountInput(intPart ?? '0', 'USD');
    return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
  }
  return formatAmountInput(String(Math.round(amount)), 'KRW');
}

export function resolveExpenseCurrency(
  value: unknown,
): ExpenseCurrency | 'invalid' | 'missing' {
  if (value === undefined || value === null || value === '') {
    return 'missing';
  }
  if (value === 'KRW' || value === 'USD') {
    return value;
  }
  return 'invalid';
}
