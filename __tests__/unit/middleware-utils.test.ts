import { isProtectedAppPath, buildLoginRedirectUrl } from '@/lib/middleware-utils';

describe('isProtectedAppPath', () => {
  it('protects /app routes', () => {
    expect(isProtectedAppPath('/app/timesheet')).toBe(true);
  });
  it('allows marketing routes', () => {
    expect(isProtectedAppPath('/about')).toBe(false);
  });
});

describe('buildLoginRedirectUrl', () => {
  it('redirects unauthenticated /app to /login with callbackUrl', () => {
    const url = buildLoginRedirectUrl('/app/timesheet', 'http://localhost:3000');
    expect(url).toBe('http://localhost:3000/login?callbackUrl=%2Fapp%2Ftimesheet');
  });
});
