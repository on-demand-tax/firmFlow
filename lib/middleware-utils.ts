export function isProtectedAppPath(pathname: string): boolean {
  return pathname.startsWith('/app');
}

export function buildLoginRedirectUrl(appPath: string, origin: string): string {
  const login = new URL('/login', origin);
  login.searchParams.set('callbackUrl', appPath);
  return login.toString();
}
