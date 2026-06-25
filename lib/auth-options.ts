import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { resolveNewUserRole } from '@/lib/onboarding';

function getAuthEnv() {
  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN ?? 'yourfirm.com').replace(
      /^@/,
      '',
    ),
    initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL ?? '',
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
  };
}

function emailMatchesAllowedDomain(email: string, allowedDomain: string): boolean {
  const domain = allowedDomain.replace(/^@/, '').toLowerCase();
  return email.toLowerCase().endsWith(`@${domain}`);
}

export function getAuthOptions(): NextAuthOptions {
  const env = getAuthEnv();

  return {
    providers: [
      GoogleProvider({
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
        authorization: {
          params: {
            // Workspace 계정 선택 유도 (보안은 signIn 콜백의 도메인 검증이 담당)
            hd: env.allowedEmailDomain,
          },
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== 'google') {
          return false;
        }

        const email = user.email?.trim().toLowerCase();
        if (!email) {
          return false;
        }

        if (!emailMatchesAllowedDomain(email, env.allowedEmailDomain)) {
          return false;
        }

        const dbConnect = (await import('@/lib/db')).default;
        const { UserModel } = await import('@/models/User');
        await dbConnect();

        let dbUser = await UserModel.findOne({ email });

        if (dbUser) {
          if (dbUser.status === 'Terminated') {
            return false;
          }

          if (user.name && dbUser.name !== user.name) {
            dbUser.name = user.name;
            await dbUser.save();
          }
        } else {
          const adminCount = await UserModel.countDocuments({ role: 'Admin' });
          const role = resolveNewUserRole(email, adminCount, env.initialAdminEmail);
          if (!role) {
            return false;
          }

          dbUser = await UserModel.create({
            email,
            name: user.name?.trim() || email,
            role,
            status: 'Active',
          });
        }

        user.id = dbUser._id.toString();
        user.role = dbUser.role;
        user.status = dbUser.status;

        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.userId = user.id;
          token.role = user.role;
          token.status = user.status;
          token.email = user.email ?? undefined;
          token.name = user.name ?? undefined;
          return token;
        }

        const email = typeof token.email === 'string' ? token.email.trim().toLowerCase() : '';
        if (!email) {
          return token;
        }

        const dbConnect = (await import('@/lib/db')).default;
        const { UserModel } = await import('@/models/User');
        await dbConnect();

        const dbUser = await UserModel.findOne({ email }).select('_id role status name');
        if (!dbUser) {
          return token;
        }

        token.userId = dbUser._id.toString();
        token.role = dbUser.role;
        token.status = dbUser.status;
        if (dbUser.name) {
          token.name = dbUser.name;
        }

        return token;
      },
      async session({ session, token }) {
        session.user = {
          userId: token.userId ?? '',
          role: token.role ?? 'Preparer',
          status: token.status ?? 'Active',
          email: token.email ?? '',
          name: token.name ?? '',
        };
        return session;
      },
    },
    secret: env.nextAuthSecret,
  };
}

export const authOptions = getAuthOptions();
