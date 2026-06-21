import { calculateProjectCost } from '@/lib/billingUtils';
import { ISalaryHistory } from '@/models/User';

describe('Billing Calculation Utility - Historical Rate Resolving', () => {
  const mockSalaryTable: ISalaryHistory[] = [
    { effectiveDate: new Date('2025-01-01'), baseSalary: 3000, hourlyBillableRate: 50 },
    { effectiveDate: new Date('2026-01-01'), baseSalary: 3500, hourlyBillableRate: 65 },
  ];

  test('2025년 작업에는 2025년 단가 적용', () => {
    const logDate = new Date('2025-06-15');
    const hours = 10;
    const cost = calculateProjectCost(hours, logDate, mockSalaryTable);
    expect(cost).toBe(500);
  });

  test('2026년 작업에는 갱신된 2026년 단가 적용', () => {
    const logDate = new Date('2026-02-20');
    const hours = 4;
    const cost = calculateProjectCost(hours, logDate, mockSalaryTable);
    expect(cost).toBe(260);
  });
});
