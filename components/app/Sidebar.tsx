'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NavItem } from '@/lib/nav-items';
import type { UserRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: '관리자',
  Approver: '승인자',
  Preparer: '작성자',
};

type SidebarProps = {
  userName: string;
  role: UserRole;
  navItems: NavItem[];
};

export function Sidebar({ userName, role, navItems }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/20 md:flex md:flex-col">
      <div className="border-b border-border px-4 py-5">
        <p className="text-sm font-semibold text-foreground">FirmFlow</p>
        <p className="text-xs text-muted-foreground">내부 업무</p>
      </div>

      <div className="border-b border-border px-4 py-4">
        <p className="truncate text-sm font-medium text-foreground">{userName}</p>
        <Badge className="mt-2" variant="secondary">
          {ROLE_LABELS[role]}
        </Badge>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/app'
                ? pathname === '/app'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          로그아웃
        </Button>
      </div>
    </aside>
  );
}
