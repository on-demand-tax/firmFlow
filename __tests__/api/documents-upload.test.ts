/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '@/models/User';
import { InternalDocumentModel } from '@/models/InternalDocument';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/drive/internal-documents', () => ({
  findOrCreateDocumentCategoryFolder: jest.fn(),
}));

jest.mock('@/lib/drive/upload', () => ({
  uploadReceipt: jest.fn(),
  mapDriveUploadError: jest.fn(() => '업로드 실패'),
}));

import { getServerSession } from 'next-auth';
import { findOrCreateDocumentCategoryFolder } from '@/lib/drive/internal-documents';
import { uploadReceipt } from '@/lib/drive/upload';
import { POST as uploadDocument } from '@/app/api/documents/upload/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindFolder = findOrCreateDocumentCategoryFolder as jest.MockedFunction<
  typeof findOrCreateDocumentCategoryFolder
>;
const mockUploadReceipt = uploadReceipt as jest.MockedFunction<typeof uploadReceipt>;

let mongoServer: MongoMemoryServer;
let preparerId: mongoose.Types.ObjectId;
let otherPreparerId: mongoose.Types.ObjectId;

function mockSession(
  options?: { userId?: mongoose.Types.ObjectId; status?: 'Active' | 'OnLeave' },
) {
  const id = options?.userId ?? preparerId;
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: id.toString(),
      role: 'Preparer',
      status: options?.status ?? 'Active',
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
  return new Request('http://localhost/api/documents/upload', {
    method: 'POST',
    body: form,
  });
}

function makePdfFile() {
  return new File([new Uint8Array(128)], 'rules.pdf', { type: 'application/pdf' });
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
  await InternalDocumentModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const preparer = await UserModel.create({
    email: 'preparer@yourfirm.com',
    name: 'Preparer',
    role: 'Preparer',
  });
  preparerId = preparer._id;

  const other = await UserModel.create({
    email: 'other@yourfirm.com',
    name: 'Other',
    role: 'Preparer',
  });
  otherPreparerId = other._id;

  mockFindFolder.mockResolvedValue('category-folder');
  mockUploadReceipt.mockResolvedValue({
    id: 'drive-file-1',
    webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
  });
});

describe('POST /api/documents/upload', () => {
  it('creates file document with version 1', async () => {
    mockSession();
    const res = await uploadDocument(
      makeFormData({
        file: makePdfFile(),
        title: '취업규칙',
        category: 'HR',
        tags: '규정,인사',
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.entryType).toBe('File');
    expect(data.currentVersion).toBe(1);
    expect(data.versions).toHaveLength(1);
    expect(mockUploadReceipt).toHaveBeenCalled();
  });

  it('appends version 2 for existing document', async () => {
    const existing = await InternalDocumentModel.create({
      title: '취업규칙',
      category: 'HR',
      entryType: 'File',
      createdBy: preparerId,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          googleDriveFileId: 'old',
          fileUrl: 'https://drive/old',
          fileName: 'old.pdf',
          mimeType: 'application/pdf',
          uploadedBy: preparerId,
          uploadedAt: new Date('2026-06-01'),
        },
      ],
    });

    mockSession();
    const res = await uploadDocument(
      makeFormData({
        file: makePdfFile(),
        title: '취업규칙',
        category: 'HR',
        documentId: existing._id.toString(),
        note: '개정',
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentVersion).toBe(2);
    expect(data.versions).toHaveLength(2);
  });

  it('rejects upload from non-owner for new version', async () => {
    const existing = await InternalDocumentModel.create({
      title: '취업규칙',
      category: 'HR',
      entryType: 'File',
      createdBy: preparerId,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          googleDriveFileId: 'old',
          fileUrl: 'https://drive/old',
          fileName: 'old.pdf',
          mimeType: 'application/pdf',
          uploadedBy: preparerId,
          uploadedAt: new Date('2026-06-01'),
        },
      ],
    });

    mockSession({ userId: otherPreparerId });
    const res = await uploadDocument(
      makeFormData({
        file: makePdfFile(),
        title: '취업규칙',
        category: 'HR',
        documentId: existing._id.toString(),
      }),
    );

    expect(res.status).toBe(403);
  });

  it('rejects invalid mime type', async () => {
    mockSession();
    const res = await uploadDocument(
      makeFormData({
        file: new File([new Uint8Array(8)], 'bad.heic', { type: 'image/heic' }),
        title: 'Bad',
        category: 'HR',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('rejects on-leave upload', async () => {
    mockSession({ status: 'OnLeave' });
    const res = await uploadDocument(
      makeFormData({
        file: makePdfFile(),
        title: 'Blocked',
        category: 'HR',
      }),
    );

    expect(res.status).toBe(403);
  });
});
