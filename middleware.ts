import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isProtectedAppPath } from '@/lib/middleware-utils';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isProtectedAppPath(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const login = new URL('/login', req.url);
      login.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(login);
    }
  }
  if (pathname === '/login') {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) return NextResponse.redirect(new URL('/app', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/login'] };
