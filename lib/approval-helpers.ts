export type ApprovalStatus = 'Approved' | 'Rejected';

type ParseApprovalResult =
  | { ok: true; status: ApprovalStatus; rejectionReason?: string }
  | { ok: false; error: string; status: number };

export function parseApprovalStatusPayload(body: {
  status?: unknown;
  rejectionReason?: unknown;
}): ParseApprovalResult {
  const { status } = body;

  if (status !== 'Approved' && status !== 'Rejected') {
    return { ok: false, error: '승인 상태가 올바르지 않습니다', status: 400 };
  }

  const rejectionReason =
    typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';

  if (status === 'Rejected' && !rejectionReason) {
    return { ok: false, error: '반려 사유를 입력해 주세요', status: 400 };
  }

  return {
    ok: true,
    status,
    rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
  };
}
