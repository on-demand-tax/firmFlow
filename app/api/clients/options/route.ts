import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ClientModel } from '@/models/Client';

export async function GET() {
  const auth = await requireRole('Preparer');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const clients = await ClientModel.find().sort({ name: 1 });

  return NextResponse.json(
    clients.map((c) => ({
      value: String(c._id),
      label: c.name,
      clientCode: c.clientCode,
    })),
  );
}
