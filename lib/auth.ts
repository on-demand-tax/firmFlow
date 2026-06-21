import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getSessionUser() {
  const session = await getSession();
  return session?.user ?? null;
}
