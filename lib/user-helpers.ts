import type { IUser } from '@/models/User';
import { getSeoulDateKey } from '@/lib/dates';

export function serializeUser(user: Pick<
  IUser,
  '_id' | 'email' | 'name' | 'role' | 'status' | 'createdAt'
>) {
  return {
    _id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export function serializeSalaryEntry(entry: {
  effectiveDate: Date;
  baseSalary: number;
  hourlyBillableRate: number;
}) {
  return {
    effectiveDate: entry.effectiveDate,
    baseSalary: entry.baseSalary,
    hourlyBillableRate: entry.hourlyBillableRate,
  };
}

export function hasDuplicateEffectiveDate(
  salaryTable: Array<{ effectiveDate: Date }>,
  effectiveDate: Date,
): boolean {
  const key = getSeoulDateKey(effectiveDate);
  return salaryTable.some((entry) => getSeoulDateKey(entry.effectiveDate) === key);
}
