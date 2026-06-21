/**
 * @jest-environment node
 */
import { dbConnect, dbDisconnect } from '@/lib/testDbHelper';
import { ClientModel } from '@/models/Client';

beforeAll(async () => {
  await dbConnect();
  await ClientModel.syncIndexes();
});

afterAll(async () => {
  await dbDisconnect();
});

beforeEach(async () => {
  await ClientModel.deleteMany({});
});

describe('ClientModel', () => {
  it('creates client with valid clientCode', async () => {
    const client = await ClientModel.create({
      name: 'Test Corp',
      clientCode: 'ACME01',
      businessRegistrationNumber: '123-45-67890',
      contactPerson: 'Kim',
      googleDriveFolderId: 'folder123',
    });
    expect(client.clientCode).toBe('ACME01');
    expect(client.name).toBe('Test Corp');
  });

  it('rejects invalid clientCode format', async () => {
    await expect(
      ClientModel.create({
        name: 'Test',
        clientCode: 'AB-01',
        businessRegistrationNumber: '123',
        contactPerson: 'Kim',
        googleDriveFolderId: 'f1',
      }),
    ).rejects.toThrow();
  });

  it('rejects clientCode shorter than 2 chars', async () => {
    await expect(
      ClientModel.create({
        name: 'Test',
        clientCode: 'A',
        businessRegistrationNumber: '123',
        contactPerson: 'Kim',
        googleDriveFolderId: 'f1',
      }),
    ).rejects.toThrow();
  });

  it('enforces unique clientCode', async () => {
    await ClientModel.create({
      name: 'First',
      clientCode: 'UNIQ01',
      businessRegistrationNumber: '111',
      contactPerson: 'A',
      googleDriveFolderId: 'f1',
    });
    await expect(
      ClientModel.create({
        name: 'Second',
        clientCode: 'UNIQ01',
        businessRegistrationNumber: '222',
        contactPerson: 'B',
        googleDriveFolderId: 'f2',
      }),
    ).rejects.toThrow();
  });

  it('uppercases clientCode on save', async () => {
    const client = await ClientModel.create({
      name: 'Test',
      clientCode: 'lower1',
      businessRegistrationNumber: '123',
      contactPerson: 'Kim',
      googleDriveFolderId: 'f1',
    });
    expect(client.clientCode).toBe('LOWER1');
  });
});
