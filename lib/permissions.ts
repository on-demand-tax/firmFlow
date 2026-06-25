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

export interface SessionUser {
  userId: string;
  role: UserRole;
}

export interface TimeLogLike {
  userId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: Date | null;
}

export function canEditTimeLog(sessionUser: SessionUser, log: TimeLogLike): boolean {
  if (log.lockedAt) {
    return false;
  }

  if (sessionUser.role === 'Admin' || sessionUser.role === 'Approver') {
    return true;
  }

  if (log.userId !== sessionUser.userId) {
    return false;
  }

  return log.status === 'Pending' || log.status === 'Rejected';
}

export interface ExpenseLike {
  userId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lockedAt?: Date | null;
}

export function canEditExpense(sessionUser: SessionUser, expense: ExpenseLike): boolean {
  if (expense.lockedAt) {
    return false;
  }

  if (sessionUser.role === 'Admin' || sessionUser.role === 'Approver') {
    return true;
  }

  if (expense.userId !== sessionUser.userId) {
    return false;
  }

  return expense.status === 'Pending' || expense.status === 'Rejected';
}

export interface DocumentLike {
  createdBy: string;
}

export function canEditDocument(sessionUser: SessionUser, doc: DocumentLike): boolean {
  if (sessionUser.role === 'Admin') {
    return true;
  }

  return doc.createdBy === sessionUser.userId;
}

export function canDeleteDocument(sessionUser: SessionUser): boolean {
  return sessionUser.role === 'Admin';
}

export function canChangeDocumentCategory(sessionUser: SessionUser): boolean {
  return sessionUser.role === 'Admin';
}
