import {
  getBillingModelLabel,
  getProjectTypeLabel,
  getWorkSubtypeLabel,
  normalizeLegacyProject,
  type ProjectType,
  type WorkSubtype,
} from '@/lib/project-types';

export function serializeProject(project: {
  _id: unknown;
  clientId: unknown;
  projectName: string;
  projectType?: string;
  workSubtype?: string;
  billingModel?: string;
  status: string;
  billingCycle?: string;
  currency?: string;
  contractAmount?: number;
  baseFeeAmount?: number;
  successFeeRate?: number;
  hourlyRate?: number;
  filingSubtype?: string;
  engagementSubtype?: string;
  eventDate?: Date;
  fiscalYearStart?: Date;
  fiscalYearEnd?: Date;
  billingAnchorDay?: number;
  notes?: string;
  createdAt: Date;
}) {
  const normalized = normalizeLegacyProject({
    projectType: project.projectType ?? 'General',
    workSubtype: project.workSubtype,
    filingSubtype: project.filingSubtype,
    engagementSubtype: project.engagementSubtype,
  });

  const projectType = normalized.projectType;
  const workSubtype = normalized.workSubtype;
  const billingModel = (project.billingModel ?? 'Hourly') as
    | 'Hourly'
    | 'Retainer'
    | 'FixedPerEvent'
    | 'BasePlusSuccess'
    | 'PerFiscalPeriod'
    | 'Manual';

  const workSubtypeLabel = workSubtype
    ? getWorkSubtypeLabel(projectType, workSubtype)
    : undefined;

  return {
    _id: String(project._id),
    clientId: String(
      (project.clientId as { _id?: unknown })?._id ?? project.clientId,
    ),
    projectName: project.projectName,
    projectType,
    projectTypeLabel: getProjectTypeLabel(projectType),
    workSubtype,
    workSubtypeLabel,
    billingModel,
    billingModelLabel: getBillingModelLabel(billingModel),
    status: project.status,
    billingCycle: project.billingCycle,
    currency: project.currency ?? 'KRW',
    contractAmount: project.contractAmount,
    baseFeeAmount: project.baseFeeAmount,
    successFeeRate: project.successFeeRate,
    hourlyRate: project.hourlyRate,
    eventDate: project.eventDate,
    fiscalYearStart: project.fiscalYearStart,
    fiscalYearEnd: project.fiscalYearEnd,
    billingAnchorDay: project.billingAnchorDay,
    notes: project.notes,
    createdAt: project.createdAt,
    legacyProjectType:
      project.projectType !== projectType ? project.projectType : undefined,
  };
}

export function displayProjectTypeLabel(
  projectType: ProjectType,
  workSubtype?: WorkSubtype,
): string {
  if (workSubtype) {
    return getWorkSubtypeLabel(projectType, workSubtype);
  }
  return getProjectTypeLabel(projectType);
}
