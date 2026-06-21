import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { hasMinRole, type UserRole } from '@/lib/permissions';
import { jsonError } from '@/lib/api-error';
import type { Session } from 'next-auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getSessionUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireSession(): Promise<
  { session: Session } | { error: ReturnType<typeof jsonError> }
> {
  const session = await getSession();
  if (!session?.user?.userId) {
    return { error: jsonError('로그인이 필요합니다', 401) };
  }
  return { session };
}

export async function requireRole(
  minRole: UserRole,
): Promise<
  { session: Session } | { error: ReturnType<typeof jsonError> }
> {
  const result = await requireSession();
  if ('error' in result) {
    return result;
  }

  if (!hasMinRole(result.session.user.role, minRole)) {
    return { error: jsonError('권한이 없습니다', 403) };
  }

  return result;
}
