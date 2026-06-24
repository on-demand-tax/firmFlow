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

  it('defaults projectType General, billingModel Hourly, currency KRW', async () => {
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Legacy',
    });
    expect(project.projectType).toBe('General');
    expect(project.billingModel).toBe('Hourly');
    expect(project.currency).toBe('KRW');
  });

  it('stores OtherWork TaxAmendment fields', async () => {
    const project = await ProjectModel.create({
      clientId,
      projectName: '경정 2024',
      projectType: 'OtherWork',
      workSubtype: 'TaxAmendment',
      billingModel: 'BasePlusSuccess',
      currency: 'KRW',
      baseFeeAmount: 500000,
      successFeeRate: 15,
    });
    expect(project.successFeeRate).toBe(15);
    expect(project.projectType).toBe('OtherWork');
    expect(project.workSubtype).toBe('TaxAmendment');
  });

  it('accepts legacy TaxAmendment projectType for read compatibility', async () => {
    const project = await ProjectModel.create({
      clientId,
      projectName: 'Legacy 경정',
      projectType: 'TaxAmendment',
      billingModel: 'BasePlusSuccess',
      currency: 'KRW',
    });
    expect(project.projectType).toBe('TaxAmendment');
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
