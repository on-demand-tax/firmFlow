export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

/** Preparer 본인 항목: 마감되지 않은 대기·반려 건만 수정 가능 */
export function canPreparerEditEntry(entry: {
  status: ApprovalStatus;
  lockedAt?: string | Date | null;
}): boolean {
  return !entry.lockedAt && (entry.status === 'Pending' || entry.status === 'Rejected');
}
