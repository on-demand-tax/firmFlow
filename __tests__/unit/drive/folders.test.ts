import { buildClientFolderName, createClientFolder } from '@/lib/drive/folders';

describe('buildClientFolderName', () => {
  it('builds sanitized folder name', () => {
    expect(buildClientFolderName('ABC Corp', 'ACME01')).toBe('ABC_Corp_ACME01');
  });

  it('handles special characters in name', () => {
    expect(buildClientFolderName('Foo & Bar', 'FB01')).toBe('Foo_Bar_FB01');
  });
});

describe('createClientFolder', () => {
  it('creates folder via injectable drive client', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'folder123' });
    const mockDriveClient = {
      createFolder: mockCreate,
    };

    const result = await createClientFolder('ABC Corp', 'ACME01', mockDriveClient);

    expect(result).toEqual({ id: 'folder123' });
    expect(mockCreate).toHaveBeenCalledWith('ABC_Corp_ACME01');
  });

  it('propagates drive errors', async () => {
    const mockDriveClient = {
      createFolder: jest.fn().mockRejectedValue(new Error('Drive API error')),
    };

    await expect(
      createClientFolder('Test', 'T01', mockDriveClient),
    ).rejects.toThrow('Drive API error');
  });
});
