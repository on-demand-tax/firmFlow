#!/usr/bin/env node
/**
 * Smoke test: upload PDF to first client folder under FirmFlow_Data.
 * Usage: node scripts/test-drive-upload.mjs [.env.local]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { uploadReceipt } from '../lib/drive/upload.ts';

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const envFile = process.argv[2] ?? '.env.local';
loadEnvFile(resolve(envFile));

const { google } = await import('googleapis');
const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(
  /\\n/g,
  '\n',
);
const owner = process.env.GOOGLE_DRIVE_FILE_OWNER_EMAIL ?? process.env.INITIAL_ADMIN_EMAIL;
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
  ...(owner ? { subject: owner } : {}),
});
await auth.authorize();
const drive = google.drive({ version: 'v3', auth });
const masterId = process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID;
const list = await drive.files.list({
  q: `'${masterId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  fields: 'files(id,name)',
  pageSize: 1,
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
});
const folder = list.data.files?.[0];
if (!folder?.id) {
  console.error('FAIL: no client folder under FirmFlow_Data — register a client first');
  process.exit(1);
}
console.log(`Target folder: ${folder.name} (${folder.id})`);
console.log(`Impersonating: ${owner ?? '(none — upload may fail)'}`);

try {
  const pdf = Buffer.from('%PDF-1.4 firmflow upload test');
  const result = await uploadReceipt(
    { name: `firmflow-receipt-test-${Date.now()}.pdf`, mimeType: 'application/pdf', buffer: pdf },
    folder.id,
  );
  console.log('Upload OK:', result.id);
  console.log('View:', result.webViewLink);
  await drive.files.delete({ fileId: result.id, supportsAllDrives: true });
  console.log('Cleanup OK');
} catch (err) {
  console.error('Upload FAILED:', err.message ?? err);
  process.exit(1);
}
