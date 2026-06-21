/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '@/models/User';
import { parseDateOnlySeoul } from '@/lib/dates';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listUsers } from '@/app/api/users/route';
import { PATCH as patchUser } from '@/app/api/users/[id]/route';
import {
  GET as getSalary,
  PATCH as patchSalary,
} from '@/app/api/users/[id]/salary/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let adminId: mongoose.Types.ObjectId;
let approverId: mongoose.Types.ObjectId;
let preparerId: mongoose.Types.ObjectId;
let targetUserId: mongoose.Types.ObjectId;

function mockSession(
  role: 'Admin' | 'Approver' | 'Preparer',
  options?: { userId?: mongoose.Types.ObjectId },
) {
  const id =
    options?.userId ??
    (role === 'Admin'
      ? adminId
      : role === 'Approver'
        ? approverId
        : preparerId);
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: id.toString(),
      role,
      status: 'Active',
      email: 'user@yourfirm.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

function makeRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  jest.setTimeout(30000);
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const admin = await UserModel.create({
    email: 'admin@yourfirm.com',
    name: 'Admin',
    role: 'Admin',
    salaryTable: [
      {
        effectiveDate: parseDateOnlySeoul('2026-01-01')!,
        baseSalary: 5000,
        hourlyBillableRate: 100,
      },
    ],
  });
  adminId = admin._id;

  const approver = await UserModel.create({
    email: 'approver@yourfirm.com',
    name: 'Approver',
    role: 'Approver',
  });
  approverId = approver._id;

  const preparer = await UserModel.create({
    email: 'preparer@yourfirm.com',
    name: 'Preparer',
    role: 'Preparer',
  });
  preparerId = preparer._id;

  const target = await UserModel.create({
    email: 'target@yourfirm.com',
    name: 'Target User',
    role: 'Preparer',
    status: 'Active',
  });
  targetUserId = target._id;
});

describe('GET /api/users', () => {
  it('returns users without salaryTable for Approver', async () => {
    mockSession('Approver');

    const res = await listUsers();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(4);
    for (const user of data) {
      expect(user).not.toHaveProperty('salaryTable');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    }
  });

  it('denies Preparer access', async () => {
    mockSession('Preparer');

    const res = await listUsers();
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/users/[id]', () => {
  it('allows Admin to update role and status', async () => {
    mockSession('Admin');

    const res = await patchUser(
      makeRequest(
        'PATCH',
        `http://localhost/api/users/${targetUserId}`,
        { role: 'Approver', status: 'OnLeave' },
      ),
      { params: Promise.resolve({ id: targetUserId.toString() }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.role).toBe('Approver');
    expect(data.status).toBe('OnLeave');
  });

  it('denies Approver from patching users', async () => {
    mockSession('Approver');

    const res = await patchUser(
      makeRequest(
        'PATCH',
        `http://localhost/api/users/${targetUserId}`,
        { role: 'Admin' },
      ),
      { params: Promise.resolve({ id: targetUserId.toString() }) },
    );

    expect(res.status).toBe(403);
  });
});

describe('GET/PATCH /api/users/[id]/salary', () => {
  it('returns salary history for Admin', async () => {
    mockSession('Admin');

    const res = await getSalary(
      makeRequest('GET', `http://localhost/api/users/${adminId}/salary`),
      { params: Promise.resolve({ id: adminId.toString() }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.salaryTable).toHaveLength(1);
    expect(data.salaryTable[0].hourlyBillableRate).toBe(100);
  });

  it('denies non-Admin salary access', async () => {
    mockSession('Approver');

    const res = await getSalary(
      makeRequest('GET', `http://localhost/api/users/${adminId}/salary`),
      { params: Promise.resolve({ id: adminId.toString() }) },
    );

    expect(res.status).toBe(403);
  });

  it('appends salary entries append-only', async () => {
    mockSession('Admin');

    const res = await patchSalary(
      makeRequest(
        'PATCH',
        `http://localhost/api/users/${targetUserId}/salary`,
        {
          effectiveDate: '2026-03-01',
          baseSalary: 3500,
          hourlyBillableRate: 65,
        },
      ),
      { params: Promise.resolve({ id: targetUserId.toString() }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.salaryTable).toHaveLength(1);
    expect(data.salaryTable[0].hourlyBillableRate).toBe(65);

    const user = await UserModel.findById(targetUserId).select('+salaryTable');
    expect(user?.salaryTable).toHaveLength(1);
  });

  it('rejects duplicate effectiveDate', async () => {
    await UserModel.findByIdAndUpdate(targetUserId, {
      salaryTable: [
        {
          effectiveDate: parseDateOnlySeoul('2026-03-01')!,
          baseSalary: 3000,
          hourlyBillableRate: 50,
        },
      ],
    });

    mockSession('Admin');

    const res = await patchSalary(
      makeRequest(
        'PATCH',
        `http://localhost/api/users/${targetUserId}/salary`,
        {
          effectiveDate: '2026-03-01',
          baseSalary: 4000,
          hourlyBillableRate: 70,
        },
      ),
      { params: Promise.resolve({ id: targetUserId.toString() }) },
    );

    expect(res.status).toBe(400);
  });
});
