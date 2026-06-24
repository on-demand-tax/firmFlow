import { NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { displayProjectTypeLabel } from '@/lib/project-serialize';
import {
  getActivityGroupsForProjectType,
  isNonBillableProjectType,
} from '@/lib/project-activities';
import { ensureNonBillableProject } from '@/lib/non-billable-project';
import { normalizeLegacyProject } from '@/lib/project-types';
import { ProjectModel } from '@/models/Project';

function serializeProjectOption(
  p: {
    _id: unknown;
    projectName: string;
    projectType?: string;
    workSubtype?: string;
    status: string;
    clientId: unknown;
  },
  client: { _id?: unknown; name?: string } | null,
) {
  const normalized = normalizeLegacyProject({
    projectType: p.projectType ?? 'General',
    workSubtype: p.workSubtype,
  });
  const typeLabel = displayProjectTypeLabel(
    normalized.projectType,
    normalized.workSubtype,
  );
  const isNonBillable = isNonBillableProjectType(normalized.projectType);
  return {
    value: String(p._id),
    label: isNonBillable ? p.projectName : `${p.projectName} (${typeLabel})`,
    projectName: p.projectName,
    projectType: normalized.projectType,
    workSubtype: normalized.workSubtype,
    projectTypeLabel: typeLabel,
    activityGroups: getActivityGroupsForProjectType(normalized.projectType),
    clientId: String(client?._id ?? p.clientId),
    clientName: client?.name ?? '',
    status: p.status,
    isNonBillable,
  };
}

export async function GET() {
  const auth = await requireRole('Preparer');
  if ('error' in auth) return auth.error;

  await dbConnect();

  const nonBillableRef = await ensureNonBillableProject();

  const filter: { status?: 'Active' } =
    auth.session.user.role === 'Preparer'
      ? { status: 'Active' }
      : {};

  const projects = await ProjectModel.find(filter)
    .populate('clientId', 'name clientCode')
    .sort({ projectName: 1 });

  const options = projects.map((p) =>
    serializeProjectOption(
      p,
      p.clientId as { _id?: unknown; name?: string },
    ),
  );

  const nonBillableIndex = options.findIndex(
    (option) => option.value === nonBillableRef.projectId,
  );
  if (nonBillableIndex > 0) {
    const [nonBillableOption] = options.splice(nonBillableIndex, 1);
    options.unshift(nonBillableOption);
  }

  return NextResponse.json(options);
}
