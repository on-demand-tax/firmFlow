/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';
import { ExpenseModel } from '@/models/Expense';
import { ProjectModel } from '@/models/Project';
import { UserModel } from '@/models/User';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listExpenses, POST as createExpense } from '@/app/api/expenses/route';
import {
  PATCH as patchExpense,
  DELETE as deleteExpense,
} from '@/app/api/expenses/[id]/route';
import { PATCH as patchExpenseStatus } from '@/app/api/expenses/[id]/status/route';
import {
  expenseClassificationFixture,
  overheadClassificationFixture,
} from '@/__tests__/helpers/expense-fixtures';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
let clientId: mongoose.Types.ObjectId;
let otherClientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;
let otherProjectId: mongoose.Types.ObjectId;
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

function coreBody(overrides: Record<string, unknown> = {}) {
  return {
    expenseType: 'Core',
    clientId: clientId.toString(),
    projectId: projectId.toString(),
    paymentMethod: 'BizCreditCardRegistered',
    expensePurpose: 'TravelTransport',
    amount: 50000,
    date: '2026-06-20',
    description: 'Travel expense',
    ...overrides,
  };
}

function overheadBody(overrides: Record<string, unknown> = {}) {
  return {
    expenseType: 'Overhead',
    paymentMethod: 'ETaxInvoiceEmail',
    expensePurpose: 'OfficeSupplies',
    amount: 12000,
    date: '2026-06-20',
    description: 'Office supplies',
    ...overrides,
  };
}

const testExpenseDefaults = expenseClassificationFixture;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  await ExpenseModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
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

  const otherClient = await ClientModel.create({
    name: 'Other Client',
    clientCode: 'OC01',
    businessRegistrationNumber: '222',
    contactPerson: 'Lee',
    googleDriveFolderId: 'f2',
  });
  otherClientId = otherClient._id;

  const project = await ProjectModel.create({
    clientId,
    projectName: 'Audit 2026',
  });
  projectId = project._id;

  const otherProject = await ProjectModel.create({
    clientId: otherClientId,
    projectName: 'Other Audit',
  });
  otherProjectId = otherProject._id;
});

describe('POST /api/expenses', () => {
  it('creates Pending Core expense for Preparer', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody()),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('Pending');
    expect(data.userId).toBe(preparerId.toString());
    expect(data.expenseType).toBe('Core');
    expect(data.clientId).toBe(clientId.toString());
    expect(data.projectId).toBe(projectId.toString());
    expect(data.currency).toBe('KRW');
  });

  it('creates expense with USD currency', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody({ currency: 'USD' })),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.currency).toBe('USD');
  });

  it('returns 400 for invalid currency', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody({ currency: 'EUR' })),
    );
    expect(res.status).toBe(400);
  });

  it('creates Overhead expense without client or project', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', overheadBody()),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.expenseType).toBe('Overhead');
    expect(data.clientId).toBeUndefined();
    expect(data.projectId).toBeUndefined();
  });

  it('returns 400 when Core expense missing clientId or projectId', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody({ projectId: undefined })),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when project does not belong to client', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody({ projectId: otherProjectId })),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when payment method is missing', async () => {
    mockSession('Preparer');
    const res = await createExpense(
      makeRequest(
        'POST',
        'http://localhost/api/expenses',
        coreBody({ paymentMethod: undefined }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 for OnLeave user', async () => {
    mockSession('Preparer', { status: 'OnLeave' });
    const res = await createExpense(
      makeRequest('POST', 'http://localhost/api/expenses', coreBody()),
    );
    expect(res.status).toBe(403);
  });
});

describe('GET /api/expenses', () => {
  beforeEach(async () => {
    await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Own expense',
    });
    await ExpenseModel.create({
      userId: otherPreparerId,
      expenseType: 'Overhead',
      ...overheadClassificationFixture,
      amount: 5000,
      date: new Date('2026-06-21'),
      description: 'Other expense',
    });
  });

  it('returns only own expenses for Preparer', async () => {
    mockSession('Preparer');
    const res = await listExpenses(makeRequest('GET', 'http://localhost/api/expenses'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].description).toBe('Own expense');
  });

  it('returns all expenses for Approver', async () => {
    mockSession('Approver', { userId: approverId });
    const res = await listExpenses(makeRequest('GET', 'http://localhost/api/expenses'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it('returns userName for approver list', async () => {
    mockSession('Approver', { userId: approverId });
    const res = await listExpenses(makeRequest('GET', 'http://localhost/api/expenses'));
    expect(res.status).toBe(200);
    const data = await res.json();
    const ownExpense = data.find((expense: { description: string }) => expense.description === 'Own expense');
    expect(ownExpense?.userName).toBe('Preparer');
  });
});

describe('PATCH /api/expenses/[id]', () => {
  it('returns 403 for OnLeave user', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
    });
    mockSession('Preparer', { status: 'OnLeave' });
    const res = await patchExpense(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}`, { amount: 20000 }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when expense is locked', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
      lockedAt: new Date(),
    });
    mockSession('Admin');
    const res = await patchExpense(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}`, { amount: 20000 }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/expenses/[id]', () => {
  it('returns 403 when expense is locked', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
      lockedAt: new Date(),
    });
    mockSession('Preparer');
    const res = await deleteExpense(
      makeRequest('DELETE', `http://localhost/api/expenses/${expense._id}`),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/expenses/[id]/status', () => {
  it('approves expense and sets approvedBy for Approver', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchExpenseStatus(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}/status`, {
        status: 'Approved',
      }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('Approved');
    expect(data.approvedBy).toBe(approverId.toString());
  });

  it('rejects expense with reason', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchExpenseStatus(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}/status`, {
        status: 'Rejected',
        rejectionReason: '영수증 불명확',
      }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rejectionReason).toBe('영수증 불명확');
  });

  it('returns 400 when rejecting without reason', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
      status: 'Pending',
    });
    mockSession('Approver', { userId: approverId });
    const res = await patchExpenseStatus(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}/status`, {
        status: 'Rejected',
      }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 for Preparer', async () => {
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      ...testExpenseDefaults,
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Work',
    });
    mockSession('Preparer');
    const res = await patchExpenseStatus(
      makeRequest('PATCH', `http://localhost/api/expenses/${expense._id}/status`, {
        status: 'Approved',
      }),
      { params: Promise.resolve({ id: expense._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});
