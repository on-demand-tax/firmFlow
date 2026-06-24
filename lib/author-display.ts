const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export const UNKNOWN_AUTHOR_LABEL = '알 수 없음';

export interface AuthorInfo {
  name?: string;
  email?: string;
}

export function normalizeObjectIdString(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  let raw: unknown = value;
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    raw = (raw as { _id: unknown })._id;
  }

  const id = String(raw);
  if (id === 'null' || id === 'undefined') return null;
  return OBJECT_ID_RE.test(id) ? id : null;
}

export function extractUserIdString(value: unknown): string {
  return normalizeObjectIdString(value) ?? '';
}

export function authorDisplayName(author?: AuthorInfo | null): string | undefined {
  const name = author?.name?.trim();
  if (name && name !== 'null') return name;
  const email = author?.email?.trim();
  if (email && email !== 'null') return email;
  return undefined;
}

export function formatAuthorLabel(item: {
  userName?: string | null;
  userEmail?: string | null;
  userId?: string | null;
}): string {
  const name = item.userName?.trim();
  if (name && name !== 'null') return name;

  const email = item.userEmail?.trim();
  if (email && email !== 'null') return email;

  const userId = extractUserIdString(item.userId);
  if (userId) return userId;

  return UNKNOWN_AUTHOR_LABEL;
}

export function resolveAuthorFromRef(userId: unknown): AuthorInfo | undefined {
  if (!userId || typeof userId !== 'object') return undefined;

  if ('email' in userId) {
    const user = userId as { name?: string | null; email?: string | null };
    return { name: user.name ?? undefined, email: user.email ?? undefined };
  }

  return undefined;
}

export function resolveAuthorLabel(
  item: { userName?: string | null; userEmail?: string | null; userId?: string | null },
  userById?: Readonly<Record<string, AuthorInfo>>,
): string {
  const fromApi = authorDisplayName({
    name: item.userName ?? undefined,
    email: item.userEmail ?? undefined,
  });
  if (fromApi) return fromApi;

  const userId = extractUserIdString(item.userId);
  if (userId) {
    const fromMap = authorDisplayName(userById?.[userId]);
    if (fromMap) return fromMap;
  }

  return UNKNOWN_AUTHOR_LABEL;
}
