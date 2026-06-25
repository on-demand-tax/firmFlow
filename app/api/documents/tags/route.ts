import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { InternalDocumentModel } from '@/models/InternalDocument';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  await dbConnect();

  const tags = await InternalDocumentModel.distinct('tags');
  return NextResponse.json({ tags: tags.filter(Boolean).sort() });
}
