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
    <Card className={cn('min-w-0', className)}>
      <CardContent className="min-w-0 space-y-2.5 pt-4 text-base">{children}</CardContent>
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
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm font-medium">{children}</span>
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
