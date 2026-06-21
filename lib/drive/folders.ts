import { sanitizeClientName } from '@/lib/sanitize';
import { createDriveClient, type DriveFolderClient } from '@/lib/drive/client';

export function buildClientFolderName(name: string, clientCode: string): string {
  return `${sanitizeClientName(name)}_${clientCode}`;
}

export async function createClientFolder(
  name: string,
  clientCode: string,
  driveClient?: DriveFolderClient,
): Promise<{ id: string }> {
  const client = driveClient ?? createDriveClient();
  const folderName = buildClientFolderName(name, clientCode);
  return client.createFolder(folderName);
}
