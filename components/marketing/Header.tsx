import Link from 'next/link';

const navLinks = [
  { href: '/', label: '홈' },
  { href: '/about', label: '소개' },
  { href: '/services', label: '업무' },
  { href: '/contact', label: '문의' },
] as const;

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          FirmFlow
        </Link>
        <nav className="flex items-center gap-1 sm:gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            내부 로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
