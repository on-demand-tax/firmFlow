'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          내부 시스템 로그인
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          회사 Google Workspace 계정으로 로그인합니다.
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => signIn('google', { callbackUrl: '/app' })}
        >
          Google로 로그인
        </Button>
      </div>
    </section>
  );
}
