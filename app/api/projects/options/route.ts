import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ProjectModel } from '@/models/Project';

export async function GET() {
  const auth = await requireRole('Preparer');
  if ('error' in auth) return auth.error;

  await dbConnect();

  const filter =
    auth.session.user.role === 'Preparer'
      ? { status: 'Active' }
      : {};

  const projects = await ProjectModel.find(filter)
    .populate('clientId', 'name clientCode')
    .sort({ projectName: 1 });

  return NextResponse.json(
    projects.map((p) => ({
      value: String(p._id),
      label: p.projectName,
      clientId: String(p.clientId?._id ?? p.clientId),
      clientName: (p.clientId as { name?: string })?.name ?? '',
      status: p.status,
    })),
  );
}
