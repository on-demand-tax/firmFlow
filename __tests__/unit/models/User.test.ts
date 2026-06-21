/**
 * @jest-environment node
 */
import { dbConnect, dbDisconnect } from '@/lib/testDbHelper';
import { UserModel } from '@/models/User';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('UserModel', () => {
  it('creates user with default Preparer role', async () => {
    const user = await UserModel.create({
      email: 'test@yourfirm.com',
      name: 'Test User',
    });
    expect(user.role).toBe('Preparer');
    expect(user.status).toBe('Active');
  });

  it('excludes salaryTable by default query', async () => {
    const user = await UserModel.create({
      email: 'admin@yourfirm.com',
      name: 'Admin',
      salaryTable: [
        {
          effectiveDate: new Date('2025-01-01'),
          baseSalary: 3000,
          hourlyBillableRate: 50,
        },
      ],
    });
    const found = await UserModel.findOne({ email: 'admin@yourfirm.com' });
    expect(found?.salaryTable).toBeUndefined();
  });
});
