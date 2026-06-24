/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  INTERNAL_CLIENT_CODE,
  INTERNAL_CLIENT_NAME,
  NON_BILLABLE_PROJECT_NAME,
  ensureNonBillableProject,
} from '@/lib/non-billable-project';
import { ClientModel } from '@/models/Client';
import { ProjectModel } from '@/models/Project';

let mongoServer: MongoMemoryServer;

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
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
});

describe('ensureNonBillableProject', () => {
  it('creates internal client and non-billable project', async () => {
    const ref = await ensureNonBillableProject();

    const client = await ClientModel.findById(ref.clientId);
    const project = await ProjectModel.findById(ref.projectId);

    expect(client?.clientCode).toBe(INTERNAL_CLIENT_CODE);
    expect(client?.name).toBe(INTERNAL_CLIENT_NAME);
    expect(project?.projectType).toBe('NonBillable');
    expect(project?.projectName).toBe(NON_BILLABLE_PROJECT_NAME);
  });

  it('reuses existing internal records', async () => {
    const first = await ensureNonBillableProject();
    const second = await ensureNonBillableProject();

    expect(second).toEqual(first);
    expect(await ClientModel.countDocuments()).toBe(1);
    expect(await ProjectModel.countDocuments()).toBe(1);
  });
});
