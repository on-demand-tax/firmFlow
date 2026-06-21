import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-foreground">FirmFlow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            소규모 회계법인을 위한 내부 업무 관리 시스템
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground">
            소개
          </Link>
          <Link href="/services" className="hover:text-foreground">
            업무
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            문의
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} FirmFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
