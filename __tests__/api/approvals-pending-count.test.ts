/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';
import { ExpenseModel } from '@/models/Expense';
import { ProjectModel } from '@/models/Project';
import { TimeLogModel } from '@/models/TimeLog';
import { UserModel } from '@/models/User';
import { overheadClassificationFixture } from '@/__tests__/helpers/expense-fixtures';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as getPendingCount } from '@/app/api/approvals/pending-count/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let clientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;
let preparerId: mongoose.Types.ObjectId;
let approverId: mongoose.Types.ObjectId;

function mockSession(role: 'Admin' | 'Approver' | 'Preparer') {
  const id = role === 'Preparer' ? preparerId : approverId;
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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await TimeLogModel.syncIndexes();
  await ExpenseModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await TimeLogModel.deleteMany({});
  await ExpenseModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const preparer = await UserModel.create({
    email: 'preparer@yourfirm.com',
    name: 'Preparer',
    role: 'Preparer',
  });
  preparerId = preparer._id;

  const approver = await UserModel.create({
    email: 'approver@yourfirm.com',
    name: 'Approver',
    role: 'Approver',
  });
  approverId = approver._id;

  const client = await ClientModel.create({
    name: 'Test Client',
    clientCode: 'TC01',
    businessRegistrationNumber: '111',
    contactPerson: 'Kim',
    googleDriveFolderId: 'f1',
  });
  clientId = client._id;

  const project = await ProjectModel.create({
    clientId,
    projectName: 'Test Project',
    projectType: 'General',
    billingModel: 'Hourly',
    status: 'Active',
  });
  projectId = project._id;
});

describe('GET /api/approvals/pending-count', () => {
  it('returns pending timelog and expense counts for Approver', async () => {
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-15'),
      hours: 2,
      description: 'Pending log',
      status: 'Pending',
    });
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-16'),
      hours: 3,
      description: 'Approved log',
      status: 'Approved',
    });
    await ExpenseModel.create({
      userId: preparerId,
      expenseType: 'Overhead',
      ...overheadClassificationFixture,
      amount: 10000,
      currency: 'KRW',
      date: new Date('2026-06-15'),
      description: 'Pending expense',
      status: 'Pending',
    });

    mockSession('Approver');
    const res = await getPendingCount();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ timeLogs: 1, expenses: 1, total: 2 });
  });

  it('returns 403 for Preparer', async () => {
    mockSession('Preparer');
    const res = await getPendingCount();

    expect(res.status).toBe(403);
  });
});
