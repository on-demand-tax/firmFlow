/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import { dbConnect, dbDisconnect } from '@/lib/testDbHelper';
import { ClientModel } from '@/models/Client';
import { ProjectModel } from '@/models/Project';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

beforeEach(async () => {
  await ProjectModel.deleteMany({});
  await ClientModel.deleteMany({});
});

describe('ProjectModel', () => {
  let clientId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const client = await ClientModel.create({
      name: 'Client',
      clientCode: 'CL01',
      businessRegistrationNumber: '123',
      contactPerson: 'Kim',
      googleDriveFolderId: 'f1',
    });
    clientId = client._id;
  });

  it('creates project with default Active status', async () => {
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Audit 2026',
    });
    expect(project.status).toBe('Active');
    expect(project.projectName).toBe('Audit 2026');
  });

  it('requires clientId', async () => {
    await expect(
      ProjectModel.create({
        projectName: 'No Client',
      }),
    ).rejects.toThrow();
  });

  it('accepts Completed status', async () => {
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Done Project',
      status: 'Completed',
    });
    expect(project.status).toBe('Completed');
  });
});
