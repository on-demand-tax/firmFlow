import { sanitizeClientName } from '@/lib/sanitize';

describe('sanitizeClientName', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeClientName('ABC Corp')).toBe('ABC_Corp');
  });

  it('removes special characters', () => {
    expect(sanitizeClientName('Foo & Bar (Ltd.)!')).toBe('Foo_Bar_Ltd');
  });

  it('truncates to 50 characters', () => {
    const long = 'A'.repeat(60);
    expect(sanitizeClientName(long)).toHaveLength(50);
  });

  it('preserves Korean alphanumeric characters', () => {
    expect(sanitizeClientName('삼성전자 Corp')).toBe('삼성전자_Corp');
  });
});
