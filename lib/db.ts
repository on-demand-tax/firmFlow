import dns from 'node:dns';
import mongoose from 'mongoose';

function ensureMongoSrvDns(): void {
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) return;

  const custom = process.env.MONGODB_DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (custom?.length) {
    dns.setServers(custom);
    return;
  }

  // Some Windows/ISP DNS resolvers refuse SRV queries (querySrv ECONNREFUSED).
  if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  }
}

// Apply before any route handler resolves mongodb+srv (avoids first-request race).
ensureMongoSrvDns();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    ensureMongoSrvDns();
    cached.promise = mongoose.connect(mongodbUri, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default dbConnect;
