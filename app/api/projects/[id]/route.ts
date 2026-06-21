import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { ProjectModel } from '@/models/Project';
import { ExpenseModel } from '@/models/Expense';
import { TimeLogModel } from '@/models/TimeLog';

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  await dbConnect();

  const project = await ProjectModel.findById(id).populate('clientId', 'name clientCode');
  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다', 404);
  }

  return NextResponse.json({
    ...serializeProject(project),
    clientName: (project.clientId as { name?: string })?.name ?? '',
    clientCode: (project.clientId as { clientCode?: string })?.clientCode ?? '',
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  await dbConnect();

  const project = await ProjectModel.findById(id);
  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다', 404);
  }

  if (body.projectName !== undefined) {
    project.projectName = String(body.projectName).trim();
  }
  if (body.status !== undefined) {
    if (!['Active', 'Completed'].includes(body.status)) {
      return jsonError('상태 값이 올바르지 않습니다', 400);
    }
    project.status = body.status;
  }

  await project.save();
  return NextResponse.json(serializeProject(project));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  await dbConnect();

  const project = await ProjectModel.findById(id);
  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다', 404);
  }

  const expenseCount = await ExpenseModel.countDocuments({ projectId: id });
  if (expenseCount > 0) {
    return jsonError('연결된 경비가 있어 삭제할 수 없습니다', 409);
  }

  const timeLogCount = await TimeLogModel.countDocuments({ projectId: id });
  if (timeLogCount > 0) {
    return jsonError('연결된 타임로그가 있어 삭제할 수 없습니다', 409);
  }

  await project.deleteOne();
  return NextResponse.json({ success: true });
}
