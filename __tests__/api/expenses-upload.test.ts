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

jest.mock('@/lib/drive/upload', () => ({
  uploadReceipt: jest.fn(),
  findOrCreateOverheadReceiptsFolder: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { uploadReceipt, findOrCreateOverheadReceiptsFolder } from '@/lib/drive/upload';
import { POST as uploadExpenseReceipt } from '@/app/api/expenses/upload/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockUploadReceipt = uploadReceipt as jest.MockedFunction<typeof uploadReceipt>;
const mockFindOverheadFolder = findOrCreateOverheadReceiptsFolder as jest.MockedFunction<
  typeof findOrCreateOverheadReceiptsFolder
>;

let mongoServer: MongoMemoryServer;
let preparerId: mongoose.Types.ObjectId;
let clientId: mongoose.Types.ObjectId;
let projectId: mongoose.Types.ObjectId;

function mockSession(status: 'Active' | 'OnLeave' = 'Active') {
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: preparerId.toString(),
      role: 'Preparer',
      status,
      email: 'preparer@yourfirm.com',
      name: 'Preparer',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

function makeFormData(fields: Record<string, string | Blob>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return new Request('http://localhost/api/expenses/upload', {
    method: 'POST',
    body: form,
  });
}

function makePdfFile(sizeBytes = 1024) {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], 'receipt.pdf', { type: 'application/pdf' });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID = 'master-folder';
  await mongoose.connect(process.env.MONGODB_URI);
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

  const client = await ClientModel.create({
    name: 'Test Client',
    clientCode: 'TC01',
    businessRegistrationNumber: '111',
    contactPerson: 'Kim',
    googleDriveFolderId: 'client-folder-123',
  });
  clientId = client._id;

  const project = await ProjectModel.create({
    clientId,
    projectName: 'Audit',
  });
  projectId = project._id;

  mockUploadReceipt.mockResolvedValue({
    id: 'drive-file-1',
    webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
  });
  mockFindOverheadFolder.mockResolvedValue('overhead-folder-456');
});

describe('POST /api/expenses/upload', () => {
  it('uploads Core receipt to client folder', async () => {
    mockSession();
    const res = await uploadExpenseReceipt(
      makeFormData({
        file: makePdfFile(),
        expenseType: 'Core',
        clientId: clientId.toString(),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('drive-file-1');
    expect(data.webViewLink).toContain('drive.google.com');
    expect(mockUploadReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'receipt.pdf', mimeType: 'application/pdf' }),
      'client-folder-123',
    );
  });

  it('uploads Overhead receipt to Overhead_Receipts folder', async () => {
    mockSession();
    const res = await uploadExpenseReceipt(
      makeFormData({
        file: makePdfFile(),
        expenseType: 'Overhead',
      }),
    );
    expect(res.status).toBe(200);
    expect(mockFindOverheadFolder).toHaveBeenCalled();
    expect(mockUploadReceipt).toHaveBeenCalledWith(
      expect.any(Object),
      'overhead-folder-456',
    );
  });

  it('updates expense when expenseId is provided', async () => {
    mockSession();
    const expense = await ExpenseModel.create({
      userId: preparerId,
      clientId,
      projectId,
      expenseType: 'Core',
      amount: 10000,
      date: new Date('2026-06-20'),
      description: 'Travel',
    });

    const res = await uploadExpenseReceipt(
      makeFormData({
        file: makePdfFile(),
        expenseType: 'Core',
        clientId: clientId.toString(),
        expenseId: expense._id.toString(),
      }),
    );
    expect(res.status).toBe(200);

    const updated = await ExpenseModel.findById(expense._id);
    expect(updated?.googleDriveFileId).toBe('drive-file-1');
    expect(updated?.receiptUrl).toContain('drive.google.com');
  });

  it('returns 400 for unsupported file type', async () => {
    mockSession();
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const res = await uploadExpenseReceipt(
      makeFormData({
        file,
        expenseType: 'Overhead',
      }),
    );
    expect(res.status).toBe(400);
    expect(mockUploadReceipt).not.toHaveBeenCalled();
  });

  it('returns 400 when file exceeds 10MB', async () => {
    mockSession();
    const res = await uploadExpenseReceipt(
      makeFormData({
        file: makePdfFile(10 * 1024 * 1024 + 1),
        expenseType: 'Overhead',
      }),
    );
    expect(res.status).toBe(400);
    expect(mockUploadReceipt).not.toHaveBeenCalled();
  });

  it('returns 403 for OnLeave user', async () => {
    mockSession('OnLeave');
    const res = await uploadExpenseReceipt(
      makeFormData({
        file: makePdfFile(),
        expenseType: 'Overhead',
      }),
    );
    expect(res.status).toBe(403);
  });
});
