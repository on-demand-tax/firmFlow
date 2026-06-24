/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';
import { ProjectModel } from '@/models/Project';
import { TimeLogModel } from '@/models/TimeLog';
import { UserModel } from '@/models/User';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listTimeLogs, POST as createTimeLog } from '@/app/api/timelogs/route';
import {
  PATCH as patchTimeLog,
  DELETE as deleteTimeLog,
} from '@/app/api/timelogs/[id]/route';
import { PATCH as patchTimeLogStatus } from '@/app/api/timelogs/[id]/status/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let clientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;
let preparerId: mongoose.Types.ObjectId;
let approverId: mongoose.Types.ObjectId;
let otherPreparerId: mongoose.Types.ObjectId;

function mockSession(
  role: 'Admin' | 'Approver' | 'Preparer',
  options?: { userId?: mongoose.Types.ObjectId; status?: 'Active' | 'OnLeave' },
) {
  const id = options?.userId ?? (role === 'Approver' ? approverId : preparerId);
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: id.toString(),
      role,
      status: options?.status ?? 'Active',
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

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    clientId: clientId.toString(),
    projectId: projectId.toString(),
    date: '2026-06-20',
    hours: 4,
    description: 'Legal review',
    ...overrides,
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await TimeLogModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await TimeLogModel.deleteMany({});
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

  const otherPreparer = await UserModel.create({
    email: 'other@yourfirm.com',
    name: 'Other',
    role: 'Preparer',
  });
  otherPreparerId = otherPreparer._id;

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
    projectName: 'Audit 2026',
  });
  projectId = project._id;
});

describe('POST /api/timelogs', () => {
  it('returns 400 when single entry hours exceed 24', async () => {
    mockSession('Preparer');
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({ hours: 26 })),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when same user and date sum exceeds 24', async () => {
    mockSession('Preparer');
    await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({ hours: 20 })),
    );
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({ hours: 5 })),
    );
    expect(res.status).toBe(400);
  });

  it('creates Pending timelog for Preparer as self', async () => {
    mockSession('Preparer');
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody()),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('Pending');
    expect(data.userId).toBe(preparerId.toString());
  });

  it('returns 403 for OnLeave user', async () => {
    mockSession('Preparer', { status: 'OnLeave' });
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody()),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when BookkeepingAgency project missing activity', async () => {
    const bkProject = await ProjectModel.create({
      clientId,
      projectName: '기장대리',
      projectType: 'BookkeepingAgency',
      billingModel: 'Retainer',
      currency: 'KRW',
      contractAmount: 100000,
      billingAnchorDay: 1,
    });
    mockSession('Preparer');
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({
        projectId: bkProject._id.toString(),
        description: '',
      })),
    );
    expect(res.status).toBe(400);
  });

  it('creates timelog with bookkeeping activity', async () => {
    const bkProject = await ProjectModel.create({
      clientId,
      projectName: '기장대리',
      projectType: 'BookkeepingAgency',
      billingModel: 'Retainer',
      currency: 'KRW',
      contractAmount: 100000,
      billingAnchorDay: 1,
    });
    mockSession('Preparer');
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({
        projectId: bkProject._id.toString(),
        activity: 'VatFiling',
        description: '',
      })),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.activity).toBe('VatFiling');
    expect(data.activityLabel).toBe('부가가치세 신고');
    expect(data.description).toBe('부가가치세 신고');
  });

  it('creates timelog with non-billable activity', async () => {
    const nbProject = await ProjectModel.create({
      clientId,
      projectName: '비청구 시간',
      projectType: 'NonBillable',
      billingModel: 'Manual',
      currency: 'KRW',
    });
    mockSession('Preparer');
    const res = await createTimeLog(
      makeRequest('POST', 'http://localhost/api/timelogs', validBody({
        projectId: nbProject._id.toString(),
        activity: 'EDU_CPE',
        description: '',
      })),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.activity).toBe('EDU_CPE');
    expect(data.activityLabel).toBe('CPE(계속전문교육) 이수');
    expect(data.description).toBe('CPE(계속전문교육) 이수');
  });
});

describe('GET /api/timelogs', () => {
  beforeEach(async () => {
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Own log',
    });
    await TimeLogModel.create({
      userId: otherPreparerId,
      clientId,
      projectId,
      date: new Date('2026-06-21'),
      hours: 3,
      description: 'Other log',
    });
  });

  it('returns only own logs for Preparer', async () => {
    mockSession('Preparer');
    const res = await listTimeLogs(makeRequest('GET', 'http://localhost/api/timelogs'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].description).toBe('Own log');
  });

  it('returns all logs for Approver', async () => {
    mockSession('Approver', { userId: approverId });
    const res = await listTimeLogs(makeRequest('GET', 'http://localhost/api/timelogs'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });
});

describe('PATCH /api/timelogs/[id]', () => {
  it('returns 403 for OnLeave user', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
    });
    mockSession('Preparer', { status: 'OnLeave' });
    const res = await patchTimeLog(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}`, { hours: 3 }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when log is locked', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
      lockedAt: new Date(),
    });
    mockSession('Admin');
    const res = await patchTimeLog(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}`, { hours: 3 }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when patch would exceed daily 24 hours', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 10,
      description: 'Morning',
    });
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 10,
      description: 'Afternoon',
    });
    mockSession('Preparer');
    const res = await patchTimeLog(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}`, { hours: 15 }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/timelogs/[id]', () => {
  it('returns 403 when log is locked', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
      lockedAt: new Date(),
    });
    mockSession('Preparer');
    const res = await deleteTimeLog(
      makeRequest('DELETE', `http://localhost/api/timelogs/${log._id}`),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/timelogs/[id]/status', () => {
  it('approves timelog and sets approvedBy for Approver', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchTimeLogStatus(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}/status`, {
        status: 'Approved',
      }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('Approved');
    expect(data.approvedBy).toBe(approverId.toString());
  });

  it('rejects timelog with reason', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchTimeLogStatus(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}/status`, {
        status: 'Rejected',
        rejectionReason: '시간 과다',
      }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('Rejected');
    expect(data.rejectionReason).toBe('시간 과다');
  });

  it('returns 400 when rejecting without reason', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchTimeLogStatus(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}/status`, {
        status: 'Rejected',
      }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns userName for approver list', async () => {
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
    });
    mockSession('Approver', { userId: approverId });
    const res = await listTimeLogs(makeRequest('GET', 'http://localhost/api/timelogs'));
    const data = await res.json();
    expect(data[0].userName).toBe('Preparer');
  });

  it('returns 403 for Preparer', async () => {
    const log = await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: new Date('2026-06-20'),
      hours: 2,
      description: 'Work',
    });
    mockSession('Preparer');
    const res = await patchTimeLogStatus(
      makeRequest('PATCH', `http://localhost/api/timelogs/${log._id}/status`, {
        status: 'Approved',
      }),
      { params: Promise.resolve({ id: log._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});
