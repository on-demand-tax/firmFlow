'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DocumentVersion = {
  version: number;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  note?: string;
};

type DocumentVersionHistoryProps = {
  versions: DocumentVersion[];
  currentVersion?: number;
  canEdit: boolean;
  onRevert: (version: number) => Promise<void>;
};

export function DocumentVersionHistory({
  versions,
  currentVersion,
  canEdit,
  onRevert,
}: DocumentVersionHistoryProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-2">
      {sorted.map((version) => {
        const isCurrent = version.version === currentVersion;

        return (
          <div
            key={version.version}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">v{version.version}</span>
                {isCurrent ? <Badge>현행</Badge> : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">{version.fileName}</p>
              <p className="text-xs break-words text-muted-foreground">
                {new Date(version.uploadedAt).toLocaleDateString('ko-KR')}
                {version.note ? ` · ${version.note}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={version.fileUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Drive에서 보기
              </a>
              {canEdit && !isCurrent ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void onRevert(version.version)}
                >
                  현행으로 지정
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
