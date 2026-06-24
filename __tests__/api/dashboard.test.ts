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
import { parseDateOnlySeoul } from '@/lib/dates';
import { parseDashboardPeriod } from '@/lib/dashboard';
import {
  expenseClassificationFixture,
  overheadClassificationFixture,
} from '@/__tests__/helpers/expense-fixtures';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as getDashboard } from '@/app/api/dashboard/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let adminId: mongoose.Types.ObjectId;
let preparerId: mongoose.Types.ObjectId;
let otherPreparerId: mongoose.Types.ObjectId;
let approverId: mongoose.Types.ObjectId;
let clientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;
let project2Id: mongoose.Types.ObjectId;

const JUNE_2026 = '2026-06-15';

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

function makeRequest(url: string): Request {
  return new Request(url);
}

async function seedDashboardData() {
  const salaryDate = parseDateOnlySeoul('2026-01-01')!;

  await UserModel.findByIdAndUpdate(preparerId, {
    salaryTable: [
      {
        effectiveDate: salaryDate,
        baseSalary: 3000,
        hourlyBillableRate: 50,
      },
    ],
  });

  await UserModel.findByIdAndUpdate(otherPreparerId, {
    salaryTable: [
      {
        effectiveDate: salaryDate,
        baseSalary: 3000,
        hourlyBillableRate: 60,
      },
    ],
  });

  const logDate = parseDateOnlySeoul(JUNE_2026)!;

  await TimeLogModel.create([
    {
      userId: preparerId,
      clientId,
      projectId,
      date: logDate,
      hours: 10,
      description: 'Approved work',
      status: 'Approved',
    },
    {
      userId: preparerId,
      clientId,
      projectId,
      date: logDate,
      hours: 5,
      description: 'Pending work',
      status: 'Pending',
    },
    {
      userId: otherPreparerId,
      clientId,
      projectId,
      date: logDate,
      hours: 4,
      description: 'Other approved',
      status: 'Approved',
    },
    {
      userId: preparerId,
      clientId,
      projectId: project2Id,
      date: logDate,
      hours: 2,
      description: 'Other project',
      status: 'Approved',
    },
  ]);

  await ExpenseModel.create([
    {
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...expenseClassificationFixture,
      amount: 1000,
      date: logDate,
      description: 'Approved core',
      status: 'Approved',
    },
    {
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...expenseClassificationFixture,
      amount: 500,
      date: logDate,
      description: 'Pending core',
      status: 'Pending',
    },
    {
      userId: preparerId,
      expenseType: 'Overhead',
      ...overheadClassificationFixture,
      amount: 300,
      date: logDate,
      description: 'Approved overhead',
      status: 'Approved',
    },
    {
      userId: preparerId,
      expenseType: 'Overhead',
      ...overheadClassificationFixture,
      amount: 200,
      date: logDate,
      description: 'Pending overhead',
      status: 'Pending',
    },
  ]);
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
  await ExpenseModel.deleteMany({});
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
    status: 'Active',
  });
  projectId = project._id;

  const project2 = await ProjectModel.create({
    clientId,
    projectName: 'Tax Review',
    status: 'Active',
  });
  project2Id = project2._id;
});

describe('GET /api/dashboard', () => {
  it('defaults to current month in Asia/Seoul when no query params', () => {
    const period = parseDashboardPeriod(
      new URLSearchParams(),
      parseDateOnlySeoul('2026-06-20')!,
    );
    expect(period).toMatchObject({
      from: '2026-06-01',
      to: '2026-06-30',
    });
  });

  it('aggregates approved hours, labor cost, and core expenses per project', async () => {
    await seedDashboardData();
    mockSession('Admin');

    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.totalHours).toBe(16);
    expect(data.summary.totalLaborCost).toBe(840);
    expect(data.summary.totalCoreExpense).toEqual({ KRW: 1000, USD: 0 });
    expect(data.summary.totalOverhead).toEqual({ KRW: 300, USD: 0 });

    const mainProject = data.projects.find(
      (p: { projectId: string }) => p.projectId === projectId.toString(),
    );
    expect(mainProject.hours).toBe(14);
    expect(mainProject.laborCost).toBe(740);
    expect(mainProject.coreExpense).toEqual({ KRW: 1000, USD: 0 });

    const secondProject = data.projects.find(
      (p: { projectId: string }) => p.projectId === project2Id.toString(),
    );
    expect(secondProject.hours).toBe(2);
    expect(secondProject.laborCost).toBe(100);
  });

  it('counts pending items separately without including them in cost totals', async () => {
    await seedDashboardData();
    mockSession('Admin');

    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(data.summary.pendingTimeLogCount).toBe(1);
    expect(data.summary.pendingExpenseCount).toBe(2);
    expect(data.summary.totalHours).toBe(16);
    expect(data.summary.totalCoreExpense).toEqual({ KRW: 1000, USD: 0 });
    expect(data.summary.totalOverhead).toEqual({ KRW: 300, USD: 0 });
  });

  it('returns overhead as a separate row', async () => {
    await seedDashboardData();
    mockSession('Admin');

    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(data.overhead).toEqual({ KRW: 300, USD: 0 });
  });

  it('Preparer sees only own contribution subset and own pending counts', async () => {
    await seedDashboardData();
    mockSession('Preparer', { userId: preparerId });

    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.totalHours).toBe(12);
    expect(data.summary.totalLaborCost).toBe(600);
    expect(data.summary.pendingTimeLogCount).toBe(1);
    expect(data.summary.pendingExpenseCount).toBe(2);

    const mainProject = data.projects.find(
      (p: { projectId: string }) => p.projectId === projectId.toString(),
    );
    expect(mainProject.hours).toBe(10);
    expect(mainProject.laborCost).toBe(500);
  });

  it('supports custom from/to date range', async () => {
    await seedDashboardData();
    mockSession('Admin');

    const res = await getDashboard(
      makeRequest(
        'http://localhost/api/dashboard?from=2026-06-01&to=2026-06-15',
      ),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.period).toEqual({ from: '2026-06-01', to: '2026-06-15' });
    expect(data.summary.totalHours).toBe(16);
  });

  it('returns labor cost 0 when user has empty salaryTable', async () => {
    const logDate = parseDateOnlySeoul(JUNE_2026)!;
    await TimeLogModel.create({
      userId: preparerId,
      clientId,
      projectId,
      date: logDate,
      hours: 8,
      description: 'No salary',
      status: 'Approved',
    });

    mockSession('Admin');

    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(data.summary.totalLaborCost).toBe(0);
    expect(data.projects[0].laborCost).toBe(0);
  });

  it('filters by clientId and projectId', async () => {
    await seedDashboardData();
    mockSession('Admin');

    const res = await getDashboard(
      makeRequest(
        `http://localhost/api/dashboard?year=2026&month=6&projectId=${project2Id}`,
      ),
    );
    const data = await res.json();

    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].projectId).toBe(project2Id.toString());
    expect(data.summary.totalHours).toBe(2);
  });

  it('aggregates core and overhead expenses by currency', async () => {
    const logDate = parseDateOnlySeoul(JUNE_2026)!;
    await ExpenseModel.create([
      {
        userId: preparerId,
        clientId,
        projectId,
        expenseType: 'Core',
        ...expenseClassificationFixture,
        amount: 1000,
        currency: 'KRW',
        date: logDate,
        description: 'KRW core',
        status: 'Approved',
      },
      {
        userId: preparerId,
        clientId,
        projectId,
        expenseType: 'Core',
        ...expenseClassificationFixture,
        amount: 50,
        currency: 'USD',
        date: logDate,
        description: 'USD core',
        status: 'Approved',
      },
      {
        userId: preparerId,
        expenseType: 'Overhead',
        ...overheadClassificationFixture,
        amount: 200,
        currency: 'USD',
        date: logDate,
        description: 'USD overhead',
        status: 'Approved',
      },
    ]);

    mockSession('Admin');
    const res = await getDashboard(
      makeRequest('http://localhost/api/dashboard?year=2026&month=6'),
    );
    const data = await res.json();

    expect(data.summary.totalCoreExpense).toEqual({ KRW: 1000, USD: 50 });
    expect(data.summary.totalOverhead).toEqual({ KRW: 0, USD: 200 });
    expect(data.projects[0].coreExpense).toEqual({ KRW: 1000, USD: 50 });
    expect(data.overhead).toEqual({ KRW: 0, USD: 200 });
  });
});
