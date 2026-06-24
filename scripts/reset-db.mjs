#!/usr/bin/env node
/**
 * Drops all collections in the MongoDB database from MONGODB_URI.
 * Usage:
 *   node scripts/reset-db.mjs .env.local --confirm
 *
 * Without --confirm, prints what would be deleted and exits.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dns from 'node:dns';
import mongoose from 'mongoose';

function ensureMongoSrvDns() {
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) return;

  const custom = process.env.MONGODB_DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (custom?.length) {
    dns.setServers(custom);
    return;
  }

  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

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

function dbNameFromUri(uri) {
  try {
    const path = new URL(uri.replace('mongodb+srv://', 'https://')).pathname;
    const name = path.replace(/^\//, '').split('?')[0];
    return name || '(default — check URI path)';
  } catch {
    return '(unknown)';
  }
}

const args = process.argv.slice(2);
const envFile = args.find((a) => !a.startsWith('--'));
const confirmed = args.includes('--confirm');

if (envFile) {
  loadEnvFile(resolve(envFile));
}

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error('✗ MONGODB_URI is not set. Pass .env.local or set the variable.');
  process.exit(1);
}

const dbName = dbNameFromUri(uri);
console.log(`Database: ${dbName}`);
console.log(`Host: ${uri.includes('@') ? uri.split('@')[1].split('/')[0] : '(hidden)'}`);

if (!confirmed) {
  console.log('\nDry run — no data deleted.');
  console.log('To wipe all collections, run:\n');
  console.log(`  node scripts/reset-db.mjs ${envFile ?? '.env.local'} --confirm\n`);
  process.exit(0);
}

ensureMongoSrvDns();

try {
  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('✓ No collections found — database is already empty.');
  } else {
    for (const { name } of collections) {
      await db.dropCollection(name);
      console.log(`✓ Dropped: ${name}`);
    }
    console.log(`\n✓ Reset complete — ${collections.length} collection(s) removed.`);
  }

  console.log('\nNext: sign in with INITIAL_ADMIN_EMAIL to create the first Admin user.');
} catch (error) {
  console.error('✗ Reset failed:', error.message);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
