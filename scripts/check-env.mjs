#!/usr/bin/env node
/**
 * Validates required env vars. Usage:
 *   node scripts/check-env.mjs              # checks process.env
 *   node scripts/check-env.mjs .env.local   # loads file first (no values printed)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const REQUIRED = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ALLOWED_EMAIL_DOMAIN',
  'INITIAL_ADMIN_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_DRIVE_MASTER_FOLDER_ID',
];

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const envFile = process.argv[2];
if (envFile) {
  loadEnvFile(resolve(envFile));
}

let ok = true;
for (const key of REQUIRED) {
  const value = process.env[key]?.trim();
  const status = value ? '✓ SET' : '✗ MISSING';
  if (!value) ok = false;
  console.log(`${status}  ${key}`);
}

if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')) {
  console.log('✓ SET  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (PEM format detected)');
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
  console.log('⚠ WARN GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY may be malformed (no PEM header)');
}

if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('http')) {
  console.log('⚠ WARN NEXTAUTH_URL should start with http:// or https://');
  ok = false;
}

process.exit(ok ? 0 : 1);
