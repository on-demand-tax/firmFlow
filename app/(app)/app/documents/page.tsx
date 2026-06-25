import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { DocumentsPageClient } from './DocumentsPageClient';

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session?.user?.userId) {
    redirect('/login');
  }

  return (
    <DocumentsPageClient role={session.user.role} userId={session.user.userId} />
  );
}
