/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClientModel } from '@/models/Client';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/drive/folders', () => ({
  createClientFolder: jest.fn(),
  buildClientFolderName: jest.requireActual('@/lib/drive/folders').buildClientFolderName,
}));

import { getServerSession } from 'next-auth';
import { createClientFolder } from '@/lib/drive/folders';
import { GET as listClients, POST as createClient } from '@/app/api/clients/route';
import {
  GET as getClient,
  PATCH as patchClient,
  DELETE as deleteClient,
} from '@/app/api/clients/[id]/route';
import { GET as getClientOptions } from '@/app/api/clients/options/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockCreateClientFolder = createClientFolder as jest.MockedFunction<
  typeof createClientFolder
>;

let mongoServer: MongoMemoryServer;

function mockSession(role: 'Admin' | 'Approver' | 'Preparer') {
  mockGetServerSession.mockResolvedValue({
    user: {
      userId: new mongoose.Types.ObjectId().toString(),
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
  await ClientModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ClientModel.deleteMany({});
  jest.clearAllMocks();
  mockCreateClientFolder.mockResolvedValue({ id: 'drive-folder-123' });
});

describe('POST /api/clients', () => {
  const validBody = {
    name: 'ABC Corp',
    clientCode: 'ACME01',
    businessRegistrationNumber: '123-45-67890',
    contactPerson: 'Kim',
  };

  it('creates client with Drive folder for Approver', async () => {
    mockSession('Approver');
    const res = await createClient(makeRequest('POST', 'http://localhost/api/clients', validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.googleDriveFolderId).toBe('drive-folder-123');
    expect(data.clientCode).toBe('ACME01');
    expect(mockCreateClientFolder).toHaveBeenCalledWith('ABC Corp', 'ACME01');
  });

  it('returns 409 for duplicate clientCode', async () => {
    mockSession('Approver');
    await createClient(makeRequest('POST', 'http://localhost/api/clients', validBody));
    const res = await createClient(makeRequest('POST', 'http://localhost/api/clients', {
      ...validBody,
      name: 'Other Corp',
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('이미 사용 중인 고객 코드입니다');
  });

  it('returns 403 for Preparer', async () => {
    mockSession('Preparer');
    const res = await createClient(makeRequest('POST', 'http://localhost/api/clients', validBody));
    expect(res.status).toBe(403);
  });

  it('returns 500 and does not persist client when Drive fails', async () => {
    mockSession('Approver');
    mockCreateClientFolder.mockRejectedValue(new Error('Drive error'));
    const res = await createClient(makeRequest('POST', 'http://localhost/api/clients', validBody));
    expect(res.status).toBe(500);
    const count = await ClientModel.countDocuments();
    expect(count).toBe(0);
  });
});

describe('GET /api/clients', () => {
  it('returns client list for Approver', async () => {
    mockSession('Approver');
    await ClientModel.create({
      name: 'Test',
      clientCode: 'T01',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    const res = await listClients(makeRequest('GET', 'http://localhost/api/clients'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it('returns 403 for Preparer', async () => {
    mockSession('Preparer');
    const res = await listClients(makeRequest('GET', 'http://localhost/api/clients'));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/clients/[id]', () => {
  it('returns client by id', async () => {
    mockSession('Approver');
    const client = await ClientModel.create({
      name: 'Test',
      clientCode: 'T02',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    const res = await getClient(
      makeRequest('GET', `http://localhost/api/clients/${client._id}`),
      { params: Promise.resolve({ id: client._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Test');
  });
});

describe('PATCH /api/clients/[id]', () => {
  it('updates client fields', async () => {
    mockSession('Admin');
    const client = await ClientModel.create({
      name: 'Old Name',
      clientCode: 'T03',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    const res = await patchClient(
      makeRequest('PATCH', `http://localhost/api/clients/${client._id}`, {
        name: 'New Name',
        contactPerson: 'Lee',
      }),
      { params: Promise.resolve({ id: client._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('New Name');
    expect(data.contactPerson).toBe('Lee');
  });
});

describe('DELETE /api/clients/[id]', () => {
  it('deletes client', async () => {
    mockSession('Approver');
    const client = await ClientModel.create({
      name: 'Delete Me',
      clientCode: 'DEL01',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    const res = await deleteClient(
      makeRequest('DELETE', `http://localhost/api/clients/${client._id}`),
      { params: Promise.resolve({ id: client._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const count = await ClientModel.countDocuments();
    expect(count).toBe(0);
  });
});

describe('GET /api/clients/options', () => {
  it('returns options for Preparer', async () => {
    mockSession('Preparer');
    await ClientModel.create({
      name: 'Option Client',
      clientCode: 'OPT01',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    const res = await getClientOptions(makeRequest('GET', 'http://localhost/api/clients/options'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ label: 'Option Client', value: expect.any(String) });
  });
});
