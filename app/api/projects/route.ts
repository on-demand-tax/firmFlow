import { NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { jsonError } from '@/lib/api-error';
import { serializeProject } from '@/lib/project-serialize';
import {
  getDuplicateWarningMessage,
  isLongLivedProjectType,
  validateProjectPayload,
} from '@/lib/project-types';
import { ProjectModel } from '@/models/Project';
import { ClientModel } from '@/models/Client';

export async function GET() {
  const auth = await requireRole('Approver');
  if ('error' in auth) return auth.error;

  await dbConnect();
  const projects = await ProjectModel.find()
    .populate('clientId', 'name clientCode')
    .sort({ projectName: 1 });

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
  const validation = validateProjectPayload(body, {
    isPatch: false,
    userRole: auth.session.user.role,
  });
  if (!validation.ok) {
    return jsonError(validation.error, validation.status);
  }

  await dbConnect();

  const client = await ClientModel.findById(validation.data.clientId);
  if (!client) {
    return jsonError('고객을 찾을 수 없습니다', 404);
  }

  try {
    const project = await ProjectModel.create({
      clientId: validation.data.clientId,
      projectName: validation.data.projectName,
      projectType: validation.data.projectType,
      billingModel: validation.data.billingModel,
      status: validation.data.status ?? 'Active',
      billingCycle: validation.data.billingCycle,
      currency: validation.data.currency,
      contractAmount: validation.data.contractAmount,
      baseFeeAmount: validation.data.baseFeeAmount,
      successFeeRate: validation.data.successFeeRate,
      hourlyRate: validation.data.hourlyRate,
      workSubtype: validation.data.workSubtype,
      eventDate: validation.data.eventDate,
      fiscalYearStart: validation.data.fiscalYearStart,
      fiscalYearEnd: validation.data.fiscalYearEnd,
      billingAnchorDay: validation.data.billingAnchorDay,
      notes: validation.data.notes,
    });

    let warning: string | undefined;
    if (
      isLongLivedProjectType(validation.data.projectType) &&
      project.status === 'Active'
    ) {
      const duplicateCount = await ProjectModel.countDocuments({
        clientId: validation.data.clientId,
        projectType: validation.data.projectType,
        status: 'Active',
        _id: { $ne: project._id },
      });
      if (duplicateCount > 0) {
        warning = getDuplicateWarningMessage(validation.data.projectType);
      }
    }

    const payload = serializeProject(project);
    return NextResponse.json(warning ? { ...payload, warning } : payload, {
      status: 201,
    });
  } catch (err) {
    console.error('POST /api/projects failed:', err);
    return jsonError('프로젝트 저장에 실패했습니다', 500);
  }
}
