import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function DataRecordCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="space-y-2.5 pt-4 text-base">{children}</CardContent>
    </Card>
  );
}

export function DataRecordRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export function DataRecordActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
      {children}
    </div>
  );
}
