#!/usr/bin/env node
/**
 * Smoke test: SA JWT auth + master folder read + create/delete subfolder.
 * Usage: node scripts/test-drive.mjs [.env.local]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { google } from 'googleapis';

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

const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(
  /\\n/g,
  '\n',
);

const lineCount = privateKey.split('\n').length;
console.log(`PEM lines after unescape: ${lineCount}`);

if (!privateKey.includes('BEGIN PRIVATE KEY') || lineCount < 3) {
  console.error('FAIL: private key is not valid PEM (expected multiline after \\n unescape)');
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

try {
  await auth.authorize();
  console.log('JWT auth: OK');

  const drive = google.drive({ version: 'v3', auth });
  const masterId = process.env.GOOGLE_DRIVE_MASTER_FOLDER_ID;

  const folder = await drive.files.get({
    fileId: masterId,
    fields: 'id,name',
    supportsAllDrives: true,
  });
  console.log(`Master folder: ${folder.data.name} (${folder.data.id})`);

  const testName = `firmflow-test-${Date.now()}`;
  const created = await drive.files.create({
    requestBody: {
      name: testName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [masterId],
    },
    fields: 'id,name',
    supportsAllDrives: true,
  });
  console.log(`Create subfolder: OK (${created.data.name})`);

  await drive.files.delete({
    fileId: created.data.id,
    supportsAllDrives: true,
  });
  console.log('Cleanup: OK');
  console.log('Drive smoke test: PASSED');
} catch (err) {
  console.error('Drive smoke test: FAILED');
  console.error(err.message ?? err);
  process.exit(1);
}
