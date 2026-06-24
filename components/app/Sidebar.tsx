'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { MenuIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavItem } from '@/lib/nav-items';
import { hasMinRole, type UserRole } from '@/lib/permissions';
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

function AppNavLinks({
  navItems,
  pathname,
  pendingApprovalCount,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  pendingApprovalCount: number;
  onNavigate?: () => void;
}) {
  return (
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
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-base transition-colors md:py-2 md:text-sm',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{item.label}</span>
              {item.href === '/app/approvals' && pendingApprovalCount > 0 ? (
                <Badge
                  data-testid="nav-approvals-badge"
                  variant={isActive ? 'default' : 'secondary'}
                >
                  {pendingApprovalCount}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserSection({ userName, role }: { userName: string; role: UserRole }) {
  return (
    <div className="border-b border-border px-4 py-4">
      <p className="truncate text-base font-medium text-foreground md:text-sm">{userName}</p>
      <Badge className="mt-2" variant="secondary">
        {ROLE_LABELS[role]}
      </Badge>
    </div>
  );
}

export function Sidebar({ userName, role, navItems }: SidebarProps) {
  const pathname = usePathname();
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasMinRole(role, 'Approver')) {
      return;
    }

    let cancelled = false;

    async function loadPendingCount() {
      const res = await fetch('/api/approvals/pending-count');
      if (!res.ok) return;
      const data: { total: number } = await res.json();
      if (!cancelled) {
        setPendingApprovalCount(data.total);
      }
    }

    void loadPendingCount();

    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
        <div>
          <p className="text-base font-semibold text-foreground">FirmFlow</p>
          <p className="text-sm text-muted-foreground">내부 업무</p>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                data-testid="mobile-nav-trigger"
                variant="outline"
                size="icon"
                aria-label="메뉴 열기"
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left" className="flex h-full w-[min(100%,16rem)] flex-col gap-0 p-0">
            <SheetHeader className="border-b border-border px-4 py-5 text-left">
              <SheetTitle>FirmFlow</SheetTitle>
              <p className="text-sm text-muted-foreground">내부 업무</p>
            </SheetHeader>
            <UserSection userName={userName} role={role} />
            <nav className="flex-1 overflow-y-auto p-3">
              <AppNavLinks
                navItems={navItems}
                pathname={pathname}
                pendingApprovalCount={pendingApprovalCount}
                onNavigate={closeMenu}
              />
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
          </SheetContent>
        </Sheet>
      </header>

      <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/20 md:flex md:flex-col">
        <div className="border-b border-border px-4 py-5">
          <p className="text-sm font-semibold text-foreground">FirmFlow</p>
          <p className="text-xs text-muted-foreground">내부 업무</p>
        </div>

        <UserSection userName={userName} role={role} />

        <nav className="flex-1 p-3">
          <AppNavLinks
            navItems={navItems}
            pathname={pathname}
            pendingApprovalCount={pendingApprovalCount}
          />
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
    </>
  );
}
