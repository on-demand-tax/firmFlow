import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          회계법인 내부 업무 관리
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          FirmFlow
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          시간 기록, 경비 관리, 프로젝트 추적을 한곳에서.
          소규모 회계법인을 위한 경량·고효율 업무 플랫폼입니다.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button nativeButton={false} render={<Link href="/login" />} size="lg">
            내부 시스템 로그인
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/about" />}
            variant="outline"
            size="lg"
          >
            FirmFlow 소개
          </Button>
        </div>
      </div>
    </section>
  );
}
