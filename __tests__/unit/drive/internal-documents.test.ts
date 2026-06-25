import {
  findOrCreateCategoryFolder,
  findOrCreateInternalDocumentsRoot,
} from '@/lib/drive/internal-documents';
import type { DriveUploadClient } from '@/lib/drive/upload';

describe('internal-documents drive folders', () => {
  const masterId = 'master-folder-id';

  function createMockClient(): DriveUploadClient & {
    folders: Map<string, Map<string, string>>;
    nextId: number;
  } {
    const folders = new Map<string, Map<string, string>>();
    let nextId = 1;

    return {
      folders,
      nextId,
      async findFolderByName(parentId, name) {
        const child = folders.get(parentId)?.get(name);
        return child ? { id: child } : null;
      },
      async createFolderInParent(name, parentId) {
        if (!folders.has(parentId)) {
          folders.set(parentId, new Map());
        }
        const id = `folder-${nextId++}`;
        folders.get(parentId)!.set(name, id);
        return { id };
      },
      async uploadReceipt() {
        throw new Error('not used');
      },
    };
  }

  it('creates Internal_Documents under master', async () => {
    const client = createMockClient();
    const rootId = await findOrCreateInternalDocumentsRoot(client, masterId);

    expect(rootId).toBe('folder-1');
    expect(client.folders.get(masterId)?.get('Internal_Documents')).toBe('folder-1');
  });

  it('reuses existing Internal_Documents root', async () => {
    const client = createMockClient();
    const first = await findOrCreateInternalDocumentsRoot(client, masterId);
    const second = await findOrCreateInternalDocumentsRoot(client, masterId);

    expect(first).toBe(second);
    expect(client.folders.get(masterId)?.size).toBe(1);
  });

  it('creates category folder under root', async () => {
    const client = createMockClient();
    const categoryId = await findOrCreateCategoryFolder('HR', client, masterId);

    expect(categoryId).toBe('folder-2');
    const rootId = client.folders.get(masterId)!.get('Internal_Documents')!;
    expect(client.folders.get(rootId)?.get('인사')).toBe('folder-2');
  });
});
