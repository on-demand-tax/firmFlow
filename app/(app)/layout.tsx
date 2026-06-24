import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/app/Sidebar';
import { getSession } from '@/lib/auth';
import { getNavItemsForRole } from '@/lib/nav-items';

export default async function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session?.user) {
    redirect('/login');
  }

  const navItems = getNavItemsForRole(session.user.role);

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Sidebar
        userName={session.user.name}
        role={session.user.role}
        navItems={navItems}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
