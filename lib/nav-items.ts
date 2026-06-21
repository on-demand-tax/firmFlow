import type { UserRole } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
};

const PREPARER_ITEMS: NavItem[] = [
  { href: '/app', label: '대시보드' },
  { href: '/app/timesheet', label: '내 타임시트' },
  { href: '/app/expenses', label: '경비' },
];

const APPROVER_ITEMS: NavItem[] = [
  { href: '/app/approvals', label: '승인 대기' },
  { href: '/app/clients', label: '고객' },
  { href: '/app/projects', label: '프로젝트' },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/app/admin/users', label: '사용자' },
  { href: '/app/admin/locks', label: '기간 마감' },
  { href: '/app/admin/salary', label: '급여 단가' },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'Admin':
      return [...PREPARER_ITEMS, ...APPROVER_ITEMS, ...ADMIN_ITEMS];
    case 'Approver':
      return [...PREPARER_ITEMS, ...APPROVER_ITEMS];
    case 'Preparer':
      return [...PREPARER_ITEMS];
  }
}
