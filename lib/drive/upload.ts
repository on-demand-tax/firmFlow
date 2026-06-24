import { PassThrough } from 'node:stream';
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
    fileOwnerEmail:
      process.env.GOOGLE_DRIVE_FILE_OWNER_EMAIL ??
      process.env.INITIAL_ADMIN_EMAIL ??
      '',
  };
}

function driveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function bufferToStream(buffer: Buffer): PassThrough {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
}

function createDriveAuth(subject?: string) {
  const env = getDriveEnv();
  return new google.auth.JWT({
    email: env.serviceAccountEmail,
    key: env.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
    ...(subject ? { subject } : {}),
  });
}

export function createDriveUploadClient(): DriveUploadClient {
  const env = getDriveEnv();
  const drive = google.drive({
    version: 'v3',
    auth: createDriveAuth(env.fileOwnerEmail || undefined),
  });

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
          body: bufferToStream(file.buffer),
        },
        fields: 'id,webViewLink',
        supportsAllDrives: true,
      });

      const id = response.data.id;
      if (!id) {
        throw new Error('Drive upload returned no file id');
      }

      return {
        id,
        webViewLink: response.data.webViewLink ?? driveFileViewUrl(id),
      };
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
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
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
        supportsAllDrives: true,
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

export function mapDriveUploadError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

  if (message.includes('storage quota') || message.includes('storageQuotaExceeded')) {
    return 'Drive에 파일을 저장할 수 없습니다. Workspace 관리자에게 문의해 주세요.';
  }

  if (
    message.includes('unauthorized_client') ||
    message.includes('delegation') ||
    message.includes('Invalid grant')
  ) {
    return 'Google Drive 위임(도메인 전체 위임) 설정이 필요합니다. deploy-vercel.md Step 3을 확인해 주세요.';
  }

  return '영수증 업로드에 실패했습니다';
}
