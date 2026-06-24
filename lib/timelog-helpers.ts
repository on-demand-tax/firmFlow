import {
  getActivityLabel,
  isValidActivityForProjectType,
  projectTypeRequiresActivity,
} from '@/lib/project-activities';
import { normalizeLegacyProject } from '@/lib/project-types';
import { ProjectModel } from '@/models/Project';
import { UserModel } from '@/models/User';
import { TimeLogModel } from '@/models/TimeLog';
import { getDayRangeSeoul, parseDateOnlySeoul } from '@/lib/dates';
import type { ITimeLog } from '@/models/TimeLog';

export { isValidHours } from '@/lib/timelog-hours';

export function serializeTimeLog(
  log: ITimeLog,
  options?: { projectType?: string; userName?: string; userEmail?: string },
) {
  const projectType = options?.projectType;
  const activity = log.activity;
  return {
    _id: String(log._id),
    userId: String(log.userId),
    userName: options?.userName,
    userEmail: options?.userEmail,
    clientId: String(log.clientId),
    projectId: String(log.projectId),
    date: log.date,
    hours: log.hours,
    activity,
    activityLabel:
      activity && projectType ? getActivityLabel(projectType, activity) : undefined,
    description: log.description,
    status: log.status,
    approvedBy: log.approvedBy ? String(log.approvedBy) : undefined,
    rejectionReason: log.rejectionReason,
    lockedAt: log.lockedAt ?? undefined,
  };
}

export async function validateDailyHours(
  userId: string,
  date: Date,
  hours: number,
  excludeLogId?: string,
): Promise<boolean> {
  const { start, end } = getDayRangeSeoul(date);
  const filter: Record<string, unknown> = {
    userId,
    date: { $gte: start, $lte: end },
  };
  if (excludeLogId) {
    filter._id = { $ne: excludeLogId };
  }

  const existing = await TimeLogModel.find(filter).select('hours');
  const total = existing.reduce((sum, log) => sum + log.hours, 0) + hours;
  return total <= 24;
}

export function parseTimeLogDate(dateInput: unknown): Date | null {
  if (typeof dateInput !== 'string') return null;
  return parseDateOnlySeoul(dateInput);
}

type TimeLogContentResult =
  | { ok: true; description: string; activity?: string }
  | { ok: false; error: string; status: number };

export async function resolveTimeLogContent(body: {
  projectId: string;
  description?: unknown;
  activity?: unknown;
}): Promise<TimeLogContentResult> {
  const project = await ProjectModel.findById(body.projectId).select(
    'projectType workSubtype',
  );
  if (!project) {
    return { ok: false, error: '프로젝트를 찾을 수 없습니다', status: 404 };
  }

  const { projectType } = normalizeLegacyProject({
    projectType: project.projectType,
    workSubtype: project.workSubtype,
  });

  const activity =
    typeof body.activity === 'string' && body.activity.trim()
      ? body.activity.trim()
      : undefined;

  if (projectTypeRequiresActivity(projectType)) {
    if (!activity || !isValidActivityForProjectType(projectType, activity)) {
      return { ok: false, error: '업무 액티비티를 선택해 주세요', status: 400 };
    }
  } else if (activity) {
    return { ok: false, error: '이 프로젝트는 액티비티를 지정할 수 없습니다', status: 400 };
  }

  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  const finalDescription =
    description || (activity ? getActivityLabel(projectType, activity) ?? '' : '');

  if (!finalDescription) {
    return { ok: false, error: '필수 항목을 입력해 주세요', status: 400 };
  }

  return { ok: true, description: finalDescription, activity };
}

export async function serializeTimeLogsWithProjects(logs: ITimeLog[]) {
  const projectIds = [...new Set(logs.map((log) => String(log.projectId)))];
  const userIds = [...new Set(logs.map((log) => String(log.userId)))];

  const [projects, users] = await Promise.all([
    ProjectModel.find({ _id: { $in: projectIds } }).select('projectType workSubtype'),
    UserModel.find({ _id: { $in: userIds } }).select('name email'),
  ]);

  const typeByProjectId = new Map(
    projects.map((p) => {
      const normalized = normalizeLegacyProject({
        projectType: p.projectType,
        workSubtype: p.workSubtype,
      });
      return [String(p._id), normalized.projectType] as const;
    }),
  );

  const userById = new Map(
    users.map((u) => [String(u._id), { name: u.name, email: u.email }] as const),
  );

  return logs.map((log) => {
    const author = userById.get(String(log.userId));
    return serializeTimeLog(log, {
      projectType: typeByProjectId.get(String(log.projectId)),
      userName: author?.name,
      userEmail: author?.email,
    });
  });
}
