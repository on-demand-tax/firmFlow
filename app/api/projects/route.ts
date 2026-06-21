import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { ProjectModel } from '@/models/Project';
import { ClientModel } from '@/models/Client';

function serializeProject(project: {
  _id: unknown;
  clientId: unknown;
  projectName: string;
  status: string;
  createdAt: Date;
}) {
  return {
    _id: String(project._id),
    clientId: String(project.clientId),
    projectName: project.projectName,
    status: project.status,
    createdAt: project.createdAt,
  };
}

export async function GET() {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const projects = await ProjectModel.find().populate('clientId', 'name clientCode').sort({ projectName: 1 });

  return NextResponse.json(
    projects.map((p) => ({
      ...serializeProject(p),
      clientName: (p.clientId as { name?: string })?.name ?? '',
      clientCode: (p.clientId as { clientCode?: string })?.clientCode ?? '',
    })),
  );
}

export async function POST(request: Request) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { clientId, projectName } = body;

  if (!clientId || !projectName) {
    return jsonError('필수 항목을 입력해 주세요', 400);
  }

  await dbConnect();

  const client = await ClientModel.findById(clientId);
  if (!client) {
    return jsonError('고객을 찾을 수 없습니다', 404);
  }

  const project = await ProjectModel.create({
    clientId,
    projectName: String(projectName).trim(),
  });

  return NextResponse.json(serializeProject(project), { status: 201 });
}
