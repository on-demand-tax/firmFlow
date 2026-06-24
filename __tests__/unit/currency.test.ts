import {
  addToCurrencyTotals,
  emptyCurrencyTotals,
  formatAmountFromNumber,
  formatAmountInput,
  formatCurrencyTotals,
  formatMoney,
  parseAmountInput,
  resolveExpenseCurrency,
} from '@/lib/currency';

describe('currency helpers', () => {
  it('formats KRW and USD amounts', () => {
    expect(formatMoney(1000, 'KRW')).toContain('1,000');
    expect(formatMoney(12.5, 'USD')).toBe('$12.50');
  });

  it('aggregates totals by currency', () => {
    const totals = emptyCurrencyTotals();
    addToCurrencyTotals(totals, 'KRW', 1000);
    addToCurrencyTotals(totals, 'USD', 25);
    expect(formatCurrencyTotals(totals)).toBe('₩1,000 / $25.00');
  });

  it('resolves expense currency with KRW default', () => {
    expect(resolveExpenseCurrency(undefined)).toBe('missing');
    expect(resolveExpenseCurrency('KRW')).toBe('KRW');
    expect(resolveExpenseCurrency('USD')).toBe('USD');
    expect(resolveExpenseCurrency('EUR')).toBe('invalid');
  });

  it('formats and parses amount input with commas', () => {
    expect(formatAmountInput('2000000', 'KRW')).toBe('2,000,000');
    expect(parseAmountInput('2,000,000')).toBe(2000000);
    expect(formatAmountFromNumber(1500000, 'KRW')).toBe('1,500,000');
    expect(formatAmountInput('1234.5', 'USD')).toBe('1,234.5');
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
  });
});
