/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '@/models/User';
import { InternalDocumentModel } from '@/models/InternalDocument';
import { parseDateOnlySeoul } from '@/lib/dates';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as listDocuments, POST as createLinkDocument } from '@/app/api/documents/route';
import { GET as listTags } from '@/app/api/documents/tags/route';
import { GET as listExpiring } from '@/app/api/documents/expiring/route';
import {
  GET as getDocument,
  PATCH as patchDocument,
  DELETE as deleteDocument,
} from '@/app/api/documents/[id]/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

let mongoServer: MongoMemoryServer;
let preparerId: mongoose.Types.ObjectId;
let otherPreparerId: mongoose.Types.ObjectId;
let adminId: mongoose.Types.ObjectId;

function mockSession(
  role: 'Admin' | 'Approver' | 'Preparer',
  options?: { userId?: mongoose.Types.ObjectId; status?: 'Active' | 'OnLeave' },
) {
  const id = options?.userId ?? (role === 'Admin' ? adminId : preparerId);
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

function makeRequest(method: string, url: string, body?: Record<string, unknown>) {
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
  await InternalDocumentModel.syncIndexes();
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

  const admin = await UserModel.create({
    email: 'admin@yourfirm.com',
    name: 'Admin',
    role: 'Admin',
  });
  adminId = admin._id;
});

describe('/api/documents', () => {
  it('creates link document', async () => {
    mockSession('Preparer');
    const res = await createLinkDocument(
      makeRequest('POST', 'http://localhost/api/documents', {
        title: '노무 안내',
        category: 'HR',
        externalUrl: 'https://example.com/hr',
        tags: ['노무'],
        expiresAt: '2026-07-02',
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.entryType).toBe('Link');
    expect(data.tags).toEqual(['노무']);
  });

  it('lists documents and filters by category', async () => {
    await InternalDocumentModel.create({
      title: 'A',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://a.example',
      createdBy: preparerId,
    });
    await InternalDocumentModel.create({
      title: 'B',
      category: 'IT',
      entryType: 'Link',
      externalUrl: 'https://b.example',
      createdBy: preparerId,
    });

    mockSession('Preparer');
    const res = await listDocuments(
      new Request('http://localhost/api/documents?category=HR'),
    );
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('A');
  });

  it('excludes expired documents by default', async () => {
    await InternalDocumentModel.create({
      title: 'Expired',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://expired.example',
      createdBy: preparerId,
      expiresAt: parseDateOnlySeoul('2026-01-01'),
    });

    mockSession('Preparer');
    const res = await listDocuments(new Request('http://localhost/api/documents'));
    const data = await res.json();
    expect(data).toHaveLength(0);
  });

  it('returns distinct tags', async () => {
    await InternalDocumentModel.create({
      title: 'A',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://a.example',
      createdBy: preparerId,
      tags: ['hr', 'guide'],
    });

    mockSession('Preparer');
    const res = await listTags();
    const data = await res.json();
    expect(data.tags).toEqual(['guide', 'hr']);
  });

  it('returns expiring documents within window', async () => {
    await InternalDocumentModel.create({
      title: 'Soon',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://soon.example',
      createdBy: preparerId,
      expiresAt: parseDateOnlySeoul('2026-06-30'),
    });

    mockSession('Preparer');
    const res = await listExpiring(
      new Request('http://localhost/api/documents/expiring?withinDays=30'),
    );
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Soon');
  });
});

describe('/api/documents/[id]', () => {
  it('allows owner to patch title', async () => {
    const doc = await InternalDocumentModel.create({
      title: 'Old',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://example.com',
      createdBy: preparerId,
    });

    mockSession('Preparer');
    const res = await patchDocument(
      makeRequest('PATCH', `http://localhost/api/documents/${doc._id}`, { title: 'New' }),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('New');
  });

  it('denies other preparer patch', async () => {
    const doc = await InternalDocumentModel.create({
      title: 'Old',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://example.com',
      createdBy: preparerId,
    });

    mockSession('Preparer', { userId: otherPreparerId });
    const res = await patchDocument(
      makeRequest('PATCH', `http://localhost/api/documents/${doc._id}`, { title: 'Hack' }),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );

    expect(res.status).toBe(403);
  });

  it('reverts currentVersion to earlier version', async () => {
    const doc = await InternalDocumentModel.create({
      title: 'Rules',
      category: 'HR',
      entryType: 'File',
      createdBy: preparerId,
      currentVersion: 2,
      versions: [
        {
          version: 1,
          googleDriveFileId: 'f1',
          fileUrl: 'https://drive/1',
          fileName: 'v1.pdf',
          mimeType: 'application/pdf',
          uploadedBy: preparerId,
          uploadedAt: new Date('2026-06-01'),
        },
        {
          version: 2,
          googleDriveFileId: 'f2',
          fileUrl: 'https://drive/2',
          fileName: 'v2.pdf',
          mimeType: 'application/pdf',
          uploadedBy: preparerId,
          uploadedAt: new Date('2026-06-02'),
        },
      ],
    });

    mockSession('Preparer');
    const res = await patchDocument(
      makeRequest('PATCH', `http://localhost/api/documents/${doc._id}`, { currentVersion: 1 }),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentVersion).toBe(1);
    expect(data.versions).toHaveLength(2);
  });

  it('allows admin delete only', async () => {
    const doc = await InternalDocumentModel.create({
      title: 'Delete me',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://example.com',
      createdBy: preparerId,
    });

    mockSession('Preparer');
    const denied = await deleteDocument(
      makeRequest('DELETE', `http://localhost/api/documents/${doc._id}`),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );
    expect(denied.status).toBe(403);

    mockSession('Admin');
    const allowed = await deleteDocument(
      makeRequest('DELETE', `http://localhost/api/documents/${doc._id}`),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );
    expect(allowed.status).toBe(200);
  });

  it('blocks mutations for on-leave users', async () => {
    mockSession('Preparer', { status: 'OnLeave' });
    const res = await createLinkDocument(
      makeRequest('POST', 'http://localhost/api/documents', {
        title: 'Blocked',
        category: 'HR',
        externalUrl: 'https://example.com',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('gets document detail', async () => {
    const doc = await InternalDocumentModel.create({
      title: 'Detail',
      category: 'HR',
      entryType: 'Link',
      externalUrl: 'https://example.com',
      createdBy: preparerId,
    });

    mockSession('Preparer');
    const res = await getDocument(
      new Request(`http://localhost/api/documents/${doc._id}`),
      { params: Promise.resolve({ id: doc._id.toString() }) },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Detail');
  });
});
