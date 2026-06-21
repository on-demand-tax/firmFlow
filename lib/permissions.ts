export type UserRole = 'Admin' | 'Approver' | 'Preparer';
export type UserStatus = 'Active' | 'OnLeave' | 'Terminated';

const ROLE_RANK: Record<UserRole, number> = {
  Admin: 3,
  Approver: 2,
  Preparer: 1,
};

export function canApprove(role: UserRole): boolean {
  return role === 'Admin' || role === 'Approver';
}

export function canManageClients(role: UserRole): boolean {
  return role === 'Admin' || role === 'Approver';
}

export function isReadOnlyOnLeave(status: UserStatus): boolean {
  return status === 'OnLeave';
}

export function hasMinRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
