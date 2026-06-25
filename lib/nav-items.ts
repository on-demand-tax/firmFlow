import type { UserRole } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
};

const DOCUMENT_ITEMS: NavItem[] = [{ href: '/app/documents', label: '문서' }];

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

const COMMON_ITEMS: NavItem[] = [{ href: '/app/about', label: '정보' }];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'Admin':
      return [...DOCUMENT_ITEMS, ...PREPARER_ITEMS, ...APPROVER_ITEMS, ...ADMIN_ITEMS, ...COMMON_ITEMS];
    case 'Approver':
      return [...DOCUMENT_ITEMS, ...PREPARER_ITEMS, ...APPROVER_ITEMS, ...COMMON_ITEMS];
    case 'Preparer':
      return [...DOCUMENT_ITEMS, ...PREPARER_ITEMS, ...COMMON_ITEMS];
  }
}
