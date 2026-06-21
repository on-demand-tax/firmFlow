export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarLinks = ['대시보드', '시간 기록', '경비', '고객', '설정'];

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/20 md:block">
        <div className="border-b border-border px-4 py-5">
          <p className="text-sm font-semibold text-foreground">FirmFlow</p>
          <p className="text-xs text-muted-foreground">내부 업무</p>
        </div>
        <nav className="p-3">
          <ul className="space-y-1">
            {sidebarLinks.map((label) => (
              <li key={label}>
                <span
                  aria-disabled="true"
                  className="block cursor-not-allowed rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
