import {
  authorDisplayName,
  formatAuthorLabel,
  normalizeObjectIdString,
  resolveAuthorLabel,
  UNKNOWN_AUTHOR_LABEL,
} from '@/lib/author-display';

describe('author-display', () => {
  it('normalizes 24-char hex ids', () => {
    expect(normalizeObjectIdString('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
  });

  it('prefers name over email for display', () => {
    expect(authorDisplayName({ name: '홍길동', email: 'hong@firm.com' })).toBe('홍길동');
  });

  it('falls back to email when name is blank', () => {
    expect(authorDisplayName({ name: '  ', email: 'hong@firm.com' })).toBe('hong@firm.com');
  });

  it('formats author label with email fallback before user id', () => {
    expect(
      formatAuthorLabel({
        userId: '507f1f77bcf86cd799439011',
        userEmail: 'hong@firm.com',
      }),
    ).toBe('hong@firm.com');
  });

  it('resolves author label from user map when API fields are missing', () => {
    expect(
      resolveAuthorLabel(
        { userId: '507f1f77bcf86cd799439011' },
        {
          '507f1f77bcf86cd799439011': { name: '홍길동', email: 'hong@firm.com' },
        },
      ),
    ).toBe('홍길동');
  });

  it('never returns null for missing author fields', () => {
    expect(formatAuthorLabel({ userId: null })).toBe(UNKNOWN_AUTHOR_LABEL);
    expect(resolveAuthorLabel({ userId: null })).toBe(UNKNOWN_AUTHOR_LABEL);
  });
});
