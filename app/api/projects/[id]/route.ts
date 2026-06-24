import { NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { serializeProject } from '@/lib/project-serialize';
import { normalizeLegacyProject, validateProjectPayload } from '@/lib/project-types';
import { ProjectModel } from '@/models/Project';
import { ExpenseModel } from '@/models/Expense';
import { TimeLogModel } from '@/models/TimeLog';

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

  const normalized = normalizeLegacyProject({
    projectType: project.projectType,
    workSubtype: project.workSubtype,
  });

  const validation = validateProjectPayload(body, {
    isPatch: true,
    userRole: auth.session.user.role,
    existing: {
      projectType: normalized.projectType,
      billingModel: project.billingModel,
      currency: project.currency,
      billingCycle: project.billingCycle,
      contractAmount: project.contractAmount,
      baseFeeAmount: project.baseFeeAmount,
      successFeeRate: project.successFeeRate,
      hourlyRate: project.hourlyRate,
      billingAnchorDay: project.billingAnchorDay,
      fiscalYearStart: project.fiscalYearStart,
      fiscalYearEnd: project.fiscalYearEnd,
      workSubtype: project.workSubtype,
      eventDate: project.eventDate,
      notes: project.notes,
    },
  });
  if (!validation.ok) {
    return jsonError(validation.error, validation.status);
  }

  const data = validation.data;

  if (data.projectName !== undefined) project.projectName = data.projectName;
  if (body.projectType !== undefined) project.projectType = data.projectType;
  if (body.billingModel !== undefined || body.projectType !== undefined) {
    project.billingModel = data.billingModel;
  }
  if (data.status !== undefined) project.status = data.status;
  if (body.billingCycle !== undefined) project.billingCycle = data.billingCycle;
  if (body.currency !== undefined) project.currency = data.currency;
  if (body.contractAmount !== undefined) project.contractAmount = data.contractAmount;
  if (body.baseFeeAmount !== undefined) project.baseFeeAmount = data.baseFeeAmount;
  if (body.successFeeRate !== undefined) project.successFeeRate = data.successFeeRate;
  if (body.hourlyRate !== undefined) project.hourlyRate = data.hourlyRate;
  if (body.workSubtype !== undefined) project.workSubtype = data.workSubtype;
  if (body.eventDate !== undefined) project.eventDate = data.eventDate;
  if (body.fiscalYearStart !== undefined) project.fiscalYearStart = data.fiscalYearStart;
  if (body.fiscalYearEnd !== undefined) project.fiscalYearEnd = data.fiscalYearEnd;
  if (body.billingAnchorDay !== undefined) {
    project.billingAnchorDay = data.billingAnchorDay;
  }
  if (body.notes !== undefined) project.notes = data.notes;

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
