/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';
import { ProjectModel } from '@/models/Project';
import { ExpenseModel } from '@/models/Expense';
import { TimeLogModel } from '@/models/TimeLog';
import { UserModel } from '@/models/User';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listProjects, POST as createProject } from '@/app/api/projects/route';
import {
  GET as getProject,
  PATCH as patchProject,
  DELETE as deleteProject,
} from '@/app/api/projects/[id]/route';
import { GET as getProjectOptions } from '@/app/api/projects/options/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let clientId: mongoose.Types.ObjectId;
let userId: mongoose.Types.ObjectId;

function mockSession(role: 'Admin' | 'Approver' | 'Preparer') {
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: userId.toString(),
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
  await ProjectModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ExpenseModel.deleteMany({});
  await TimeLogModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const user = await UserModel.create({
    email: 'user@yourfirm.com',
    name: 'Test User',
    role: 'Approver',
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
});

describe('POST /api/projects', () => {
  it('creates project for Approver', async () => {
    mockSession('Approver');
    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: 'Audit 2026',
        projectType: 'General',
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.projectName).toBe('Audit 2026');
    expect(data.status).toBe('Active');
    expect(data.projectType).toBe('General');
  });

  it('creates BookkeepingAgency with derived billing defaults', async () => {
    mockSession('Approver');
    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: '기장대리',
        projectType: 'BookkeepingAgency',
        contractAmount: 200000,
        currency: 'KRW',
        billingAnchorDay: 15,
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.billingModel).toBe('Retainer');
    expect(data.billingCycle).toBe('Monthly');
    expect(data.projectType).toBe('BookkeepingAgency');
    expect(data.projectTypeLabel).toBe('기장대리');
  });

  it('accepts legacy MonthlyBookkeeping and normalizes type', async () => {
    mockSession('Approver');
    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: 'Legacy 기장',
        projectType: 'MonthlyBookkeeping',
        contractAmount: 200000,
        currency: 'KRW',
        billingAnchorDay: 15,
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.projectType).toBe('BookkeepingAgency');
    expect(data.workSubtype).toBe('GeneralBookkeeping');
  });

  it('returns 400 for TaxAmendment missing baseFeeAmount', async () => {
    mockSession('Approver');
    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: '경정',
        projectType: 'OtherWork',
        workSubtype: 'TaxAmendment',
        currency: 'KRW',
        eventDate: '2023-01-01',
        successFeeRate: 20,
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('기본금');
  });

  it('returns warning for duplicate long-lived project', async () => {
    mockSession('Approver');
    await ProjectModel.create({
      clientId,
      projectName: 'Existing',
      projectType: 'BookkeepingAgency',
      workSubtype: 'GeneralBookkeeping',
      billingModel: 'Retainer',
      billingCycle: 'Monthly',
      currency: 'KRW',
      contractAmount: 100000,
      billingAnchorDay: 1,
    });

    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: 'Another',
        projectType: 'BookkeepingAgency',
        contractAmount: 200000,
        currency: 'KRW',
        billingAnchorDay: 15,
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.warning).toContain('기장대리');
  });

  it('returns 403 for Preparer', async () => {
    mockSession('Preparer');
    const res = await createProject(
      makeRequest('POST', 'http://localhost/api/projects', {
        clientId: clientId.toString(),
        projectName: 'Audit',
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/projects/[id]', () => {
  it('returns 409 when Expenses exist', async () => {
    mockSession('Approver');
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Has Expenses',
    });
    await ExpenseModel.create({
      userId,
      clientId,
      projectId: project._id,
      expenseType: 'Core',
      amount: 5000,
      date: new Date('2026-03-01'),
      description: 'Expense',
    });

    const res = await deleteProject(
      makeRequest('DELETE', `http://localhost/api/projects/${project._id}`),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('경비');
  });

  it('returns 409 when TimeLogs exist', async () => {
    mockSession('Approver');
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Has Logs',
    });
    await TimeLogModel.create({
      userId,
      clientId,
      projectId: project._id,
      date: new Date('2026-03-01'),
      hours: 2,
      description: 'Work',
    });

    const res = await deleteProject(
      makeRequest('DELETE', `http://localhost/api/projects/${project._id}`),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('타임로그');
  });

  it('deletes project when no TimeLogs', async () => {
    mockSession('Approver');
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Empty',
    });
    const res = await deleteProject(
      makeRequest('DELETE', `http://localhost/api/projects/${project._id}`),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(200);
    expect(await ProjectModel.countDocuments()).toBe(0);
  });
});

describe('GET /api/projects/options', () => {
  it('excludes Completed projects for Preparer', async () => {
    mockSession('Preparer');
    await ProjectModel.create({
      clientId,
      projectName: 'Active Project',
      status: 'Active',
    });
    await ProjectModel.create({
      clientId,
      projectName: 'Done Project',
      status: 'Completed',
    });

    const res = await getProjectOptions(
      makeRequest('GET', 'http://localhost/api/projects/options'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].label).toBe('Active Project (일반)');
    expect(data[0].projectTypeLabel).toBe('일반');
  });

  it('includes Completed projects for Approver', async () => {
    mockSession('Approver');
    await ProjectModel.create({
      clientId,
      projectName: 'Active Project',
      status: 'Active',
    });
    await ProjectModel.create({
      clientId,
      projectName: 'Done Project',
      status: 'Completed',
    });

    const res = await getProjectOptions(
      makeRequest('GET', 'http://localhost/api/projects/options'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });
});

describe('GET /api/projects', () => {
  it('returns project list for Approver', async () => {
    mockSession('Approver');
    await ProjectModel.create({ clientId, projectName: 'P1' });
    const res = await listProjects(makeRequest('GET', 'http://localhost/api/projects'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].projectTypeLabel).toBe('일반');
  });
});

describe('PATCH /api/projects/[id]', () => {
  it('updates project status', async () => {
    mockSession('Admin');
    const project = await ProjectModel.create({
      clientId,
      projectName: 'To Complete',
    });
    const res = await patchProject(
      makeRequest('PATCH', `http://localhost/api/projects/${project._id}`, {
        status: 'Completed',
      }),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('Completed');
  });

  it('allows Approver to override billingModel', async () => {
    mockSession('Approver');
    const project = await ProjectModel.create({
      clientId,
      projectName: '기장',
      projectType: 'BookkeepingAgency',
      workSubtype: 'GeneralBookkeeping',
      billingModel: 'Retainer',
      billingCycle: 'Monthly',
      currency: 'KRW',
      contractAmount: 100000,
      billingAnchorDay: 1,
    });
    const res = await patchProject(
      makeRequest('PATCH', `http://localhost/api/projects/${project._id}`, {
        billingModel: 'Hourly',
        hourlyRate: 50000,
      }),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.billingModel).toBe('Hourly');
  });
});

describe('GET /api/projects/[id]', () => {
  it('returns project by id', async () => {
    mockSession('Approver');
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Detail',
    });
    const res = await getProject(
      makeRequest('GET', `http://localhost/api/projects/${project._id}`),
      { params: Promise.resolve({ id: project._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projectName).toBe('Detail');
  });
});
