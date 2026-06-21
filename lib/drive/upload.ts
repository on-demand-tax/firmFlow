import { google } from 'googleapis';

export interface DriveReceiptFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export interface DriveUploadClient {
  uploadReceipt(
    file: DriveReceiptFile,
    folderId: string,
  ): Promise<{ id: string; webViewLink: string }>;
  findFolderByName(parentId: string, name: string): Promise<{ id: string } | null>;
  createFolderInParent(name: string, parentId: string): Promise<{ id: string }>;
}

function getDriveEnv() {
  return {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
    privateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(
      /\\n/g,
      '\n',
    ),
    masterFolderId: process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID ?? '',
  };
}

export function createDriveUploadClient(): DriveUploadClient {
  const env = getDriveEnv();

  const auth = new google.auth.JWT({
    email: env.serviceAccountEmail,
    key: env.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  return {
    async uploadReceipt(file, folderId) {
      const response = await drive.files.create({
        requestBody: {
          name: file.name,
          mimeType: file.mimeType,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimeType,
          body: file.buffer,
        },
        fields: 'id, webViewLink',
      });

      const id = response.data.id;
      const webViewLink = response.data.webViewLink;
      if (!id || !webViewLink) {
        throw new Error('Drive upload returned incomplete response');
      }

      return { id, webViewLink };
    },

    async findFolderByName(parentId, name) {
      const response = await drive.files.list({
        q: [
          `'${parentId}' in parents`,
          `name = '${name.replace(/'/g, "\\'")}'`,
          "mimeType = 'application/vnd.google-apps.folder'",
          'trashed = false',
        ].join(' and '),
        fields: 'files(id)',
        pageSize: 1,
      });

      const id = response.data.files?.[0]?.id;
      return id ? { id } : null;
    },

    async createFolderInParent(name, parentId) {
      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });

      const id = response.data.id;
      if (!id) {
        throw new Error('Drive folder creation returned no id');
      }

      return { id };
    },
  };
}

export async function uploadReceipt(
  file: DriveReceiptFile,
  folderId: string,
  driveClient?: DriveUploadClient,
): Promise<{ id: string; webViewLink: string }> {
  const client = driveClient ?? createDriveUploadClient();
  return client.uploadReceipt(file, folderId);
}

export async function findOrCreateOverheadReceiptsFolder(
  driveClient?: DriveUploadClient,
): Promise<string> {
  const client = driveClient ?? createDriveUploadClient();
  const masterId = process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID ?? '';
  const existing = await client.findFolderByName(masterId, 'Overhead_Receipts');
  if (existing) {
    return existing.id;
  }
  const created = await client.createFolderInParent('Overhead_Receipts', masterId);
  return created.id;
}
