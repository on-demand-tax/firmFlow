import { parseApprovalStatusPayload } from '@/lib/approval-helpers';

describe('parseApprovalStatusPayload', () => {
  it('accepts Approved without rejection reason', () => {
    expect(parseApprovalStatusPayload({ status: 'Approved' })).toEqual({
      ok: true,
      status: 'Approved',
      rejectionReason: undefined,
    });
  });

  it('requires rejection reason for Rejected', () => {
    const result = parseApprovalStatusPayload({ status: 'Rejected' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('반려 사유');
      expect(result.status).toBe(400);
    }
  });

  it('accepts Rejected with rejection reason', () => {
    expect(
      parseApprovalStatusPayload({
        status: 'Rejected',
        rejectionReason: '영수증 누락',
      }),
    ).toEqual({
      ok: true,
      status: 'Rejected',
      rejectionReason: '영수증 누락',
    });
  });
});
