import { google } from 'googleapis';

export interface DriveFolderClient {
  createFolder(name: string): Promise<{ id: string }>;
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

export function createDriveClient(): DriveFolderClient {
  const env = getDriveEnv();

  const auth = new google.auth.JWT({
    email: env.serviceAccountEmail,
    key: env.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  return {
    async createFolder(name: string) {
      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [env.masterFolderId],
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
