/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';
import { PeriodLockModel } from '@/models/PeriodLock';
import { ProjectModel } from '@/models/Project';
import { TimeLogModel } from '@/models/TimeLog';
import { UserModel } from '@/models/User';
import { parseDateOnlySeoul } from '@/lib/dates';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listPeriodLocks, POST as createPeriodLock } from '@/app/api/period-locks/route';
import { DELETE as deletePeriodLock } from '@/app/api/period-locks/[id]/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let adminId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;
let clientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;

function mockSession(role: 'Admin' | 'Approver' | 'Preparer') {
  const id = role === 'Admin' ? adminId : userId;
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
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await PeriodLockModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PeriodLockModel.deleteMany({});
  await TimeLogModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const admin = await UserModel.create({
    email: 'admin@yourfirm.com',
    name: 'Admin',
    role: 'Admin',
  });
  adminId = admin._id;

  const user = await UserModel.create({
    email: 'user@yourfirm.com',
    name: 'User',
    role: 'Preparer',
  });
  userId = user._id;

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
    projectName: 'Audit',
  });
  projectId = project._id;
});

describe('POST /api/period-locks', () => {
  it('locks TimeLogs in monthly range', async () => {
    const inRange = parseDateOnlySeoul('2026-03-15')!;
    const outOfRange = parseDateOnlySeoul('2026-04-01')!;

    await TimeLogModel.create({
      userId,
      clientId,
      projectId,
      date: inRange,
      hours: 2,
      description: 'March work',
    });
    await TimeLogModel.create({
      userId,
      clientId,
      projectId,
      date: outOfRange,
      hours: 3,
      description: 'April work',
    });

    mockSession('Admin');
    const res = await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', { year: 2026, month: 3 }),
    );
    expect(res.status).toBe(201);

    const locked = await TimeLogModel.findOne({ description: 'March work' });
    const unlocked = await TimeLogModel.findOne({ description: 'April work' });
    expect(locked?.lockedAt).toBeDefined();
    expect(unlocked?.lockedAt).toBeUndefined();
  });

  it('returns 409 for overlapping lock ranges', async () => {
    mockSession('Admin');
    await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      }),
    );
    const res = await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', {
        startDate: '2026-03-15',
        endDate: '2026-04-15',
      }),
    );
    expect(res.status).toBe(409);
  });

  it('returns 403 for non-Admin', async () => {
    mockSession('Approver');
    const res = await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', { year: 2026, month: 3 }),
    );
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/period-locks/[id]', () => {
  it('clears lockedAt on affected TimeLogs', async () => {
    const date = parseDateOnlySeoul('2026-03-10')!;
    await TimeLogModel.create({
      userId,
      clientId,
      projectId,
      date,
      hours: 2,
      description: 'Work',
    });

    mockSession('Admin');
    const createRes = await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', { year: 2026, month: 3 }),
    );
    const created = await createRes.json();

    const logBefore = await TimeLogModel.findOne({ description: 'Work' });
    expect(logBefore?.lockedAt).toBeDefined();

    const deleteRes = await deletePeriodLock(
      makeRequest('DELETE', `http://localhost/api/period-locks/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(deleteRes.status).toBe(200);

    const logAfter = await TimeLogModel.findOne({ description: 'Work' });
    expect(logAfter?.lockedAt).toBeUndefined();
    expect(await PeriodLockModel.countDocuments()).toBe(0);
  });
});

describe('GET /api/period-locks', () => {
  it('returns lock list for Admin', async () => {
    mockSession('Admin');
    await createPeriodLock(
      makeRequest('POST', 'http://localhost/api/period-locks', { year: 2026, month: 3 }),
    );
    const res = await listPeriodLocks(makeRequest('GET', 'http://localhost/api/period-locks'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});
