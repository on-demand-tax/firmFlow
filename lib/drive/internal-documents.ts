import type { DocumentCategory } from '@/lib/document-categories';
import { getDocumentCategoryFolderName } from '@/lib/document-categories';
import { createDriveUploadClient, type DriveUploadClient } from '@/lib/drive/upload';

const ROOT_FOLDER_NAME = 'Internal_Documents';

export async function findOrCreateInternalDocumentsRoot(
  driveClient: DriveUploadClient,
  masterFolderId: string,
): Promise<string> {
  const existing = await driveClient.findFolderByName(masterFolderId, ROOT_FOLDER_NAME);
  if (existing) {
    return existing.id;
  }

  const created = await driveClient.createFolderInParent(ROOT_FOLDER_NAME, masterFolderId);
  return created.id;
}

export async function findOrCreateCategoryFolder(
  category: DocumentCategory,
  driveClient: DriveUploadClient,
  masterFolderId: string,
): Promise<string> {
  const rootId = await findOrCreateInternalDocumentsRoot(driveClient, masterFolderId);
  const folderName = getDocumentCategoryFolderName(category);
  const existing = await driveClient.findFolderByName(rootId, folderName);
  if (existing) {
    return existing.id;
  }

  const created = await driveClient.createFolderInParent(folderName, rootId);
  return created.id;
}

export async function findOrCreateDocumentCategoryFolder(
  category: DocumentCategory,
  driveClient?: DriveUploadClient,
): Promise<string> {
  const client = driveClient ?? createDriveUploadClient();
  const masterFolderId = process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID ?? '';
  return findOrCreateCategoryFolder(category, client, masterFolderId);
}
