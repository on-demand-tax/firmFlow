import type { ISalaryHistory } from '@/models/User';

export function calculateProjectCost(
  hours: number,
  logDate: Date,
  salaryTable: ISalaryHistory[],
): number {
  if (salaryTable.length === 0) {
    return 0;
  }

  const applicable = salaryTable
    .filter((entry) => entry.effectiveDate <= logDate)
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());

  const rate = applicable[0]?.hourlyBillableRate ?? salaryTable[0].hourlyBillableRate;
  return hours * rate;
}
