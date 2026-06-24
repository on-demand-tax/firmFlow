/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '@/models/User';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET as getProjectTypes } from '@/app/api/project-types/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

let mongoServer: MongoMemoryServer;
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

function makeRequest(method: string, url: string): Request {
  return new Request(url, { method });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  jest.clearAllMocks();

  const user = await UserModel.create({
    email: 'user@yourfirm.com',
    name: 'Test User',
    role: 'Preparer',
  });
  userId = user._id;
});

describe('GET /api/project-types', () => {
  it('returns registry for Preparer', async () => {
    mockSession('Preparer');
    const res = await getProjectTypes(
      makeRequest('GET', 'http://localhost/api/project-types'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.types).toHaveLength(10);
    expect(
      data.types.find((t: { id: string }) => t.id === 'BookkeepingAgency').label,
    ).toBe('기장대리');
    const filingAgency = data.types.find(
      (t: { id: string }) => t.id === 'FilingAgency',
    );
    expect(filingAgency.subtypes.length).toBeGreaterThan(0);
    expect(data.billingModels.length).toBeGreaterThan(0);
  });
});
